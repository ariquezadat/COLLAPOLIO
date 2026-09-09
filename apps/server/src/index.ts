import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server, type Socket } from 'socket.io';
import { legalActions, withDerived, type Action, type GameEvent } from '@collapolio/engine';
import { config } from './config.js';
import { diffState } from './patch.js';
import { RateLimiter } from './ratelimit.js';
import { RoomManager } from './rooms.js';
import { initStats, recordGame } from './stats.js';
import { createStore, type RoomRecord } from './store.js';
import {
  cleanNick,
  cleanText,
  isAmount,
  isString,
  isTileIndex,
  parseSettings,
  parseTradeSide,
} from './validate.js';

const store = await createStore();
await initStats();
const manager = new RoomManager(store);
const limiter = new RateLimiter();

const app = express();
app.use(cors({ origin: config.origins, credentials: true }));
app.use(express.json({ limit: '32kb' }));

app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

/** Browser de salas: sólo las públicas */
app.get('/api/rooms', async (_req, res) => {
  res.json({ rooms: await manager.listPublic() });
});

app.get('/api/rooms/:code', async (req, res) => {
  const room = await manager.get(req.params.code);
  if (!room) return res.status(404).json({ error: 'not_found' });
  res.json({ room: manager.summary(room) });
});

const http = createServer(app);
const io = new Server(http, {
  cors: { origin: config.origins, credentials: true },
  pingInterval: 20_000,
  pingTimeout: 25_000,
  maxHttpBufferSize: 64 * 1024,
});

interface SocketData {
  code?: string;
  /** Sin `playerId` el socket sólo mira: recibe estado pero no puede actuar */
  playerId?: string;
  nick?: string;
  spectator?: boolean;
}

type Ack = (res: { ok: boolean; code?: string; error?: string }) => void;

function ackOf(fn: unknown): Ack {
  return typeof fn === 'function' ? (fn as Ack) : () => {};
}

/** Emite el delta de estado y los eventos derivados de una acción */
const recorded = new Set<string>();

async function broadcast(room: RoomRecord, prev: any, events: GameEvent[]) {
  const patch = diffState(withDerived(prev), withDerived(room.state));
  if (patch) io.to(room.code).emit('state_patch', patch);
  // Historial: se guarda una sola vez por sala
  if (events.some((e) => e.type === 'game_over') && !recorded.has(room.code)) {
    recorded.add(room.code);
    void recordGame(room.code, withDerived(room.state));
  }
  for (const ev of events) {
    if (ev.type === 'log_entry') {
      io.to(room.code).emit('log_entry', ev.entry);
    } else {
      const { type, ...payload } = ev as Record<string, unknown> & { type: string };
      io.to(room.code).emit(type, payload);
    }
  }
}

async function sendSnapshot(socket: Socket, room: RoomRecord) {
  const snap = manager.snapshot(room);
  socket.emit('room_state', {
    ...snap,
    you: socket.data.playerId,
    legal: socket.data.playerId ? legalActions(room.state, socket.data.playerId) : [],
  });
}

/** Envuelve una acción del reducer: valida sala, jugador y límite de tasa */
function handler(
  socket: Socket,
  event: string,
  build: (payload: any, playerId: string) => Action | { error: string } | null,
  cost = 1,
) {
  socket.on(event, async (payload: unknown, cb?: unknown) => {
    const ack = ackOf(cb);
    const data = socket.data as SocketData;
    if (!limiter.allow(socket.id, cost)) return ack({ ok: false, error: 'rate_limited' });
    if (!data.code || !data.playerId) return ack({ ok: false, error: 'not_in_room' });
    const room = await manager.get(data.code);
    if (!room) return ack({ ok: false, error: 'no_room' });

    const built = build(payload ?? {}, data.playerId);
    if (!built) return ack({ ok: false, error: 'bad_payload' });
    if ('error' in built) return ack({ ok: false, error: built.error });

    const result = await manager.apply(room, built);
    if (result.error) return ack({ ok: false, error: result.error });
    await broadcast(result.room, result.prev, result.events);
    ack({ ok: true });
  });
}

io.on('connection', (socket) => {
  socket.on('create_room', async (payload: any, cb?: unknown) => {
    const ack = ackOf(cb);
    if (!limiter.allow(socket.id, 5)) return ack({ ok: false, error: 'rate_limited' });
    if (!isString(payload?.playerId, 64)) return ack({ ok: false, error: 'bad_payload' });
    const room = await manager.create({
      hostId: payload.playerId,
      name: cleanText(payload?.name, 40) ?? '',
      isPrivate: payload?.isPrivate !== false,
      settings: parseSettings(payload?.settings),
    });
    ack({ ok: true, code: room.code });
  });

  socket.on('quick_play', async (payload: any, cb?: unknown) => {
    const ack = ackOf(cb);
    if (!limiter.allow(socket.id, 5)) return ack({ ok: false, error: 'rate_limited' });
    if (!isString(payload?.playerId, 64)) return ack({ ok: false, error: 'bad_payload' });
    const existing = await manager.findOpenPublic();
    if (existing) return ack({ ok: true, code: existing.code });
    const room = await manager.create({
      hostId: payload.playerId,
      name: 'Partida rápida',
      isPrivate: false,
    });
    ack({ ok: true, code: room.code });
  });

  socket.on('list_rooms', async (_p: unknown, cb?: unknown) => {
    const ack = ackOf(cb) as unknown as (r: any) => void;
    if (!limiter.allow(socket.id, 2)) return ack({ ok: false, error: 'rate_limited' });
    ack({ ok: true, rooms: await manager.listPublic() });
  });

  socket.on('join_room', async (payload: any, cb?: unknown) => {
    const ack = ackOf(cb);
    if (!limiter.allow(socket.id, 3)) return ack({ ok: false, error: 'rate_limited' });
    if (!isString(payload?.code, 12) || !isString(payload?.playerId, 64)) {
      return ack({ ok: false, error: 'bad_payload' });
    }
    const room = await manager.get(payload.code);
    if (!room) return ack({ ok: false, error: 'no_room' });

    const data = socket.data as SocketData;
    data.code = room.code;
    data.playerId = payload.playerId;
    data.nick = cleanNick(payload?.nick);

    const result = await manager.apply(room, {
      type: 'JOIN',
      playerId: payload.playerId,
      nick: data.nick,
      avatar: cleanText(payload?.avatar, 24) ?? 'a1',
    });
    if (result.error) {
      // Partida empezada o sala llena: se entra como espectador, que es lo que
      // ofrece el botón "Mirar" del browser de salas.
      if (result.error === 'game_in_progress' || result.error === 'room_full') {
        data.playerId = undefined;
        data.spectator = true;
        socket.join(room.code);
        await sendSnapshot(socket, room);
        return ack({ ok: true, code: room.code });
      }
      data.code = undefined;
      data.playerId = undefined;
      return ack({ ok: false, error: result.error });
    }
    data.spectator = false;
    socket.join(room.code);
    await broadcast(result.room, result.prev, result.events);
    await sendSnapshot(socket, result.room);
    ack({ ok: true, code: room.code });
  });

  socket.on('leave_room', async (_p: unknown, cb?: unknown) => {
    const ack = ackOf(cb);
    const data = socket.data as SocketData;
    if (!data.code || !data.playerId) return ack({ ok: true });
    const room = await manager.get(data.code);
    if (room) {
      const result = await manager.apply(room, { type: 'LEAVE', playerId: data.playerId });
      await broadcast(result.room, result.prev, result.events);
      io.to(room.code).emit('player_disconnected', { playerId: data.playerId });
    }
    socket.leave(data.code);
    data.code = undefined;
    data.playerId = undefined;
    ack({ ok: true });
  });

  socket.on('resync', async (_p: unknown, cb?: unknown) => {
    const ack = ackOf(cb);
    const data = socket.data as SocketData;
    if (!data.code) return ack({ ok: false, error: 'not_in_room' });
    const room = await manager.get(data.code);
    if (!room) return ack({ ok: false, error: 'no_room' });
    await sendSnapshot(socket, room);
    ack({ ok: true });
  });

  socket.on('chat_message', async (payload: any, cb?: unknown) => {
    const ack = ackOf(cb);
    const data = socket.data as SocketData;
    if (!limiter.allow(socket.id, 2)) return ack({ ok: false, error: 'rate_limited' });
    if (!data.code || !data.playerId) return ack({ ok: false, error: 'not_in_room' });
    const text = cleanText(payload?.text);
    if (!text) return ack({ ok: false, error: 'empty' });
    const room = await manager.get(data.code);
    if (!room) return ack({ ok: false, error: 'no_room' });
    const player = room.state.players.find((p) => p.id === data.playerId);
    if (!player) return ack({ ok: false, error: 'not_player' });
    const msg = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      playerId: player.id,
      nick: player.nick,
      text,
      at: Date.now(),
    };
    manager.addChat(room, msg);
    await manager.save(room);
    io.to(room.code).emit('chat_message', msg);
    ack({ ok: true });
  });

  /* ── Acciones de partida: toda la validación de reglas vive en el reducer ── */
  const now = () => Date.now();

  handler(socket, 'start_game', (_p, id) => ({ type: 'START_GAME', playerId: id, at: now() }), 3);
  handler(socket, 'add_bot', (_p, id) => ({ type: 'ADD_BOT', playerId: id }), 3);
  handler(socket, 'kick_player', (p, id) =>
    isString(p?.targetId, 64) ? { type: 'KICK_PLAYER', playerId: id, targetId: p.targetId } : null,
  );
  handler(socket, 'set_settings', (p, id) => ({
    type: 'SET_SETTINGS',
    playerId: id,
    settings: parseSettings(p?.settings) as any,
  }));
  handler(socket, 'roll_dice', (_p, id) => ({ type: 'ROLL_DICE', playerId: id, at: now() }), 2);
  handler(socket, 'ack_card', (_p, id) => ({ type: 'ACK_CARD', playerId: id, at: now() }));
  handler(socket, 'buy_property', (_p, id) => ({ type: 'BUY_PROPERTY', playerId: id, at: now() }));
  handler(socket, 'decline_purchase', (_p, id) => ({
    type: 'DECLINE_PURCHASE',
    playerId: id,
    at: now(),
  }));
  handler(socket, 'end_turn', (_p, id) => ({ type: 'END_TURN', playerId: id, at: now() }));
  handler(socket, 'pay_bail', (_p, id) => ({ type: 'PAY_BAIL', playerId: id, at: now() }));
  handler(socket, 'use_jail_card', (_p, id) => ({ type: 'USE_JAIL_CARD', playerId: id, at: now() }));
  handler(socket, 'declare_bankruptcy', (_p, id) => ({
    type: 'DECLARE_BANKRUPTCY',
    playerId: id,
    at: now(),
  }));

  for (const [event, type] of [
    ['build_house', 'BUILD_HOUSE'],
    ['sell_house', 'SELL_HOUSE'],
    ['mortgage', 'MORTGAGE'],
    ['unmortgage', 'UNMORTGAGE'],
  ] as const) {
    handler(socket, event, (p, id) =>
      isTileIndex(p?.tileIndex) ? ({ type, playerId: id, tileIndex: p.tileIndex, at: now() } as Action) : null,
    );
  }

  handler(socket, 'bid', (p, id) =>
    isAmount(p?.amount) ? { type: 'BID', playerId: id, amount: Math.floor(p.amount), at: now() } : null,
  );
  handler(socket, 'pass_bid', (_p, id) => ({ type: 'PASS_BID', playerId: id, at: now() }));

  handler(
    socket,
    'propose_trade',
    (p, id) => {
      const offer = parseTradeSide(p?.offer);
      const request = parseTradeSide(p?.request);
      if (!offer || !request || !isString(p?.to, 64)) return null;
      return {
        type: 'PROPOSE_TRADE',
        playerId: id,
        // El id del intercambio lo asigna el servidor: el cliente no lo controla
        tradeId: `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        to: p.to,
        offer,
        request,
        counterOf: isString(p?.counterOf, 64) ? p.counterOf : null,
        at: now(),
      };
    },
    3,
  );
  handler(socket, 'respond_trade', (p, id) =>
    isString(p?.tradeId, 64)
      ? { type: 'RESPOND_TRADE', playerId: id, tradeId: p.tradeId, accept: !!p.accept, at: now() }
      : null,
  );
  handler(socket, 'cancel_trade', (p, id) =>
    isString(p?.tradeId, 64)
      ? { type: 'CANCEL_TRADE', playerId: id, tradeId: p.tradeId, at: now() }
      : null,
  );

  socket.on('disconnect', async () => {
    limiter.forget(socket.id);
    const data = socket.data as SocketData;
    if (!data.code || !data.playerId) return;
    const room = await manager.get(data.code);
    if (!room) return;
    // Sigue habiendo otra pestaña del mismo jugador conectada
    const stillHere = [...io.sockets.sockets.values()].some(
      (s) => s.id !== socket.id && (s.data as SocketData).playerId === data.playerId && (s.data as SocketData).code === data.code,
    );
    if (stillHere) return;
    const result = await manager.apply(room, {
      type: 'SET_CONNECTED',
      playerId: data.playerId,
      connected: false,
      at: Date.now(),
    });
    await broadcast(result.room, result.prev, result.events);
    io.to(room.code).emit('player_disconnected', { playerId: data.playerId });
  });
});

/* ─────────────────────── Reloj del servidor (autoritativo) ─────────────────── */

let ticking = false;
setInterval(async () => {
  if (ticking) return;
  ticking = true;
  try {
    const rooms = await store.list();
    const at = Date.now();
    for (const room of rooms) {
      if (room.state.phase === 'LOBBY' || room.state.phase === 'GAME_OVER') continue;
      // Sin nadie mirando, la sala se congela hasta que alguien vuelva
      if ((io.sockets.adapter.rooms.get(room.code)?.size ?? 0) === 0) continue;
      const { events, prev } = await manager.step(room, at);
      if (events.length) await broadcast(room, prev, events);
    }
  } catch (err) {
    console.error('[tick]', err);
  } finally {
    ticking = false;
  }
}, config.tickMs);

setInterval(() => {
  manager.collectGarbage().catch((err) => console.error('[gc]', err));
}, 60_000);

http.listen(config.port, () => {
  console.log(`[collapolio] servidor de sockets en :${config.port}`);
  console.log(`[collapolio] origenes permitidos: ${config.origins.join(', ')}`);
});
