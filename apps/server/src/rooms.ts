import {
  botDecide,
  botDelay,
  createInitialState,
  reduce,
  withDerived,
  type Action,
  type GameEvent,
  type GameSettings,
  type GameState,
} from '@collapolio/engine';
import { config } from './config.js';
import type { ChatMessage, RoomRecord, Store } from './store.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos

export function generateCode(): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export interface ApplyResult {
  room: RoomRecord;
  events: GameEvent[];
  prev: GameState;
  error?: string;
}

export class RoomManager {
  /** Momento en que cada bot puede volver a actuar (clave `sala:bot`) */
  private botClock = new Map<string, number>();

  constructor(private store: Store) {}

  async create(opts: {
    hostId: string;
    name: string;
    isPrivate: boolean;
    settings?: Partial<GameSettings>;
  }): Promise<RoomRecord> {
    let code = generateCode();
    for (let i = 0; i < 5 && (await this.store.get(code)); i++) code = generateCode();
    const room: RoomRecord = {
      id: code,
      code,
      name: opts.name.slice(0, 40) || `Sala ${code}`,
      isPrivate: opts.isPrivate,
      state: createInitialState({ hostId: opts.hostId, settings: opts.settings }),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      chat: [],
    };
    await this.store.set(room);
    return room;
  }

  get(code: string) {
    return this.store.get(code.toUpperCase());
  }

  async save(room: RoomRecord) {
    room.updatedAt = Date.now();
    await this.store.set(room);
  }

  async remove(code: string) {
    for (const key of [...this.botClock.keys()]) {
      if (key.startsWith(`${code}:`)) this.botClock.delete(key);
    }
    await this.store.delete(code);
  }

  /** Salas públicas visibles en el browser de salas */
  async listPublic() {
    const all = await this.store.list();
    return all
      .filter((r) => !r.isPrivate)
      .filter((r) => r.state.players.length > 0)
      .filter((r) => r.state.phase !== 'GAME_OVER')
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 60)
      .map((r) => this.summary(r));
  }

  summary(r: RoomRecord) {
    return {
      code: r.code,
      name: r.name,
      players: r.state.players.length,
      maxPlayers: r.state.settings.maxPlayers,
      phase: r.state.phase,
      inLobby: r.state.phase === 'LOBBY',
      hasBots: r.state.players.some((p) => p.isBot),
      hasSpace: r.state.players.length < r.state.settings.maxPlayers,
      settings: {
        startingCash: r.state.settings.startingCash,
        turnTimer: r.state.settings.turnTimer,
        allowAuctions: r.state.settings.allowAuctions,
        vacationCash: r.state.settings.vacationCash,
        x2RentOnFullSet: r.state.settings.x2RentOnFullSet,
      },
      updatedAt: r.updatedAt,
    };
  }

  /** Matchmaking rápido: primera sala pública en lobby con cupo */
  async findOpenPublic(): Promise<RoomRecord | null> {
    const all = await this.store.list();
    const candidates = all
      .filter(
        (r) =>
          !r.isPrivate &&
          r.state.phase === 'LOBBY' &&
          r.state.players.length < r.state.settings.maxPlayers &&
          r.state.players.length > 0,
      )
      .sort((a, b) => b.state.players.length - a.state.players.length);
    return candidates[0] ?? null;
  }

  /** Aplica una acción validada por el reducer y persiste el resultado */
  async apply(room: RoomRecord, action: Action): Promise<ApplyResult> {
    const prev = room.state;
    const result = reduce(prev, action);
    if (result.error) return { room, events: [], prev, error: result.error };
    room.state = result.state;
    await this.save(room);
    return { room, events: result.events, prev };
  }

  addChat(room: RoomRecord, msg: ChatMessage) {
    room.chat.push(msg);
    if (room.chat.length > 120) room.chat.splice(0, room.chat.length - 120);
  }

  /**
   * Un paso de reloj: timers de turno/subasta y la jugada del bot que
   * corresponda. Devuelve todos los eventos generados.
   */
  async step(room: RoomRecord, now: number): Promise<{ events: GameEvent[]; prev: GameState }> {
    const prev = room.state;
    let events: GameEvent[] = [];

    const tick = reduce(room.state, { type: 'TICK', at: now });
    room.state = tick.state;
    events = events.concat(tick.events);

    // Cada bot tiene su propio reloj: en una subasta pujan en paralelo,
    // pero cada uno con un retardo que se lee como jugada humana.
    if (room.state.phase !== 'LOBBY' && room.state.phase !== 'GAME_OVER') {
      for (const bot of room.state.players.filter((p) => p.isBot && !p.bankrupt)) {
        const key = `${room.code}:${bot.id}`;
        if (now < (this.botClock.get(key) ?? 0)) continue;
        const action = botDecide(room.state, bot.id, now);
        if (!action) continue;
        const r = reduce(room.state, action);
        if (r.error) {
          // Acción inválida: espera un poco antes de reintentar para no girar en vacío
          this.botClock.set(key, now + 500);
          continue;
        }
        room.state = r.state;
        events = events.concat(r.events);
        this.botClock.set(key, now + botDelay(action));
      }
    }

    if (events.length) await this.save(room);
    return { events, prev };
  }

  /** Estado listo para el cliente (incluye patrimonio neto calculado) */
  snapshot(room: RoomRecord) {
    return {
      code: room.code,
      name: room.name,
      isPrivate: room.isPrivate,
      state: withDerived(room.state),
      chat: room.chat,
      serverTime: Date.now(),
    };
  }

  async collectGarbage() {
    const all = await this.store.list();
    const now = Date.now();
    for (const r of all) {
      const empty = r.state.players.every((p) => !p.connected || p.isBot);
      const stale = now - r.updatedAt > config.emptyRoomTtlMs;
      if ((empty && stale) || now - r.updatedAt > 1000 * 60 * 60 * 6) {
        await this.remove(r.code);
      }
    }
  }
}
