import type {
  Action,
  Debt,
  GameEvent,
  GameSettings,
  GameState,
  LogEntry,
  Player,
  ReduceResult,
  Tile,
} from './types.js';
import { BOARD_SIZE, DEFAULT_SETTINGS, JAIL_INDEX, PLAYER_COLORS, createBoard } from './board.js';
import { CHANCE_CARDS, CHEST_CARDS, getCard, type Card } from './cards.js';
import { nextInt, shuffle } from './rng.js';
import {
  activePlayers,
  calcRent,
  canBuildHouse,
  canSellHouse,
  currentPlayer,
  getPlayer,
  liquidationValue,
  netWorth,
} from './selectors.js';

/** Duración de la animación de movimiento, en ms por casilla */
const MS_PER_STEP = 190;
const MS_TELEPORT = 520;
const MS_MOVE_MAX = 2600;
/** Un jugador desconectado se auto-juega pasado este tiempo */
export const DISCONNECT_GRACE_MS = 60_000;

interface Ctx {
  s: GameState;
  events: GameEvent[];
}

/* ───────────────────────────── Estado inicial ───────────────────────────── */

export function createInitialState(opts: {
  hostId: string;
  settings?: Partial<GameSettings>;
  seed?: number;
}): GameState {
  return {
    phase: 'LOBBY',
    players: [],
    order: [],
    turnIndex: 0,
    board: createBoard(),
    dice: null,
    doublesCount: 0,
    pendingPurchase: null,
    pendingCard: null,
    debt: null,
    auction: null,
    trades: [],
    decks: { chance: [], chest: [] },
    discards: { chance: [], chest: [] },
    log: [],
    settings: { ...DEFAULT_SETTINGS, ...(opts.settings ?? {}) },
    winnerId: null,
    hostId: opts.hostId,
    freeParkingPot: 0,
    lastMove: null,
    forcedRent: null,
    turnDeadline: null,
    resolveAt: null,
    rng: opts.seed ?? Math.floor(Math.random() * 2 ** 31),
    logSeq: 0,
    startedAt: null,
  };
}

/* ─────────────────────────────── Utilidades ─────────────────────────────── */

function log(ctx: Ctx, key: string, params?: Record<string, string | number>, playerId?: string) {
  const entry: LogEntry = { id: ++ctx.s.logSeq, at: Date.now(), key, params, playerId };
  ctx.s.log.push(entry);
  if (ctx.s.log.length > 300) ctx.s.log.splice(0, ctx.s.log.length - 300);
  ctx.events.push({ type: 'log_entry', entry });
}

function roll(ctx: Ctx): [number, number] {
  if (ctx.s._forcedDice) {
    const d = ctx.s._forcedDice;
    ctx.s._forcedDice = null;
    return d;
  }
  const a = nextInt(ctx.s.rng, 6);
  const b = nextInt(a.seed, 6);
  ctx.s.rng = b.seed;
  return [a.value + 1, b.value + 1];
}

function credit(ctx: Ctx, playerId: string, amount: number, reason: string) {
  const p = getPlayer(ctx.s, playerId);
  if (!p || amount <= 0) return;
  p.money += amount;
  ctx.events.push({ type: 'money_changed', playerId, delta: amount, reason });
}

/**
 * Cobra `amount` a `playerId`. Si no alcanza, abre una deuda que el jugador
 * debe resolver liquidando activos (o declarándose en quiebra).
 * Devuelve true si el cobro se completó de inmediato.
 */
function charge(
  ctx: Ctx,
  playerId: string,
  amount: number,
  creditorId: string | null,
  reason: Debt['reason'],
  distributeTo?: string[] | null,
): boolean {
  const p = getPlayer(ctx.s, playerId);
  if (!p || amount <= 0) return true;

  if (p.money >= amount) {
    p.money -= amount;
    ctx.events.push({ type: 'money_changed', playerId, delta: -amount, reason });
    payOut(ctx, amount, creditorId, distributeTo, reason);
    return true;
  }

  ctx.s.debt = { debtorId: playerId, creditorId, amount, reason, distributeTo: distributeTo ?? null };
  ctx.s.phase = 'AWAITING_ACTION';
  log(ctx, 'log.debt', { amount }, playerId);

  // Si ni liquidando todo alcanza, la quiebra es inmediata
  if (liquidationValue(ctx.s, p) < amount) {
    goBankrupt(ctx, playerId, creditorId);
  }
  return false;
}

function payOut(
  ctx: Ctx,
  amount: number,
  creditorId: string | null,
  distributeTo: string[] | null | undefined,
  reason: string,
) {
  if (distributeTo && distributeTo.length > 0) {
    const each = Math.floor(amount / distributeTo.length);
    for (const id of distributeTo) credit(ctx, id, each, reason);
    return;
  }
  if (creditorId) {
    credit(ctx, creditorId, amount, reason);
  } else if (ctx.s.settings.vacationCash) {
    // El bote de Descanso acumula lo que va al banco
    ctx.s.freeParkingPot += amount;
  }
}

function setDeadline(ctx: Ctx, at: number) {
  const t = ctx.s.settings.turnTimer;
  ctx.s.turnDeadline = t > 0 ? at + t * 1000 : null;
}

function tileOf(ctx: Ctx, i: number): Tile {
  return ctx.s.board[i];
}

/* ──────────────────────────────── Movimiento ─────────────────────────────── */

function moveSteps(ctx: Ctx, playerId: string, steps: number, at: number) {
  const p = getPlayer(ctx.s, playerId)!;
  const from = p.position;
  const path: number[] = [];
  const dir = steps >= 0 ? 1 : -1;
  let pos = from;
  for (let i = 0; i < Math.abs(steps); i++) {
    pos = (pos + dir + BOARD_SIZE) % BOARD_SIZE;
    path.push(pos);
    if (dir === 1 && pos === 0) {
      credit(ctx, playerId, ctx.s.settings.goSalary, 'go');
      log(ctx, 'log.pass_go', { amount: ctx.s.settings.goSalary }, playerId);
    }
  }
  p.position = pos;
  ctx.s.lastMove = { playerId, from, to: pos, path, teleport: false };
  ctx.s.resolveAt = at + Math.min(MS_MOVE_MAX, Math.max(400, path.length * MS_PER_STEP));
  ctx.events.push({ type: 'player_moved', playerId, path, teleport: false });
}

function moveTo(ctx: Ctx, playerId: string, index: number, collectGo: boolean, at: number) {
  const p = getPlayer(ctx.s, playerId)!;
  const from = p.position;
  if (collectGo && index < from) {
    credit(ctx, playerId, ctx.s.settings.goSalary, 'go');
    log(ctx, 'log.pass_go', { amount: ctx.s.settings.goSalary }, playerId);
  }
  p.position = index;
  ctx.s.lastMove = { playerId, from, to: index, path: [index], teleport: true };
  ctx.s.resolveAt = at + MS_TELEPORT;
  ctx.events.push({ type: 'player_moved', playerId, path: [index], teleport: true });
}

function sendToJail(ctx: Ctx, playerId: string, at: number) {
  const p = getPlayer(ctx.s, playerId)!;
  p.position = JAIL_INDEX;
  p.inJail = true;
  p.jailTurns = 0;
  ctx.s.doublesCount = 0;
  ctx.s.lastMove = { playerId, from: p.position, to: JAIL_INDEX, path: [JAIL_INDEX], teleport: true };
  ctx.events.push({ type: 'player_moved', playerId, path: [JAIL_INDEX], teleport: true });
  log(ctx, 'log.go_to_jail', {}, playerId);
  ctx.s.phase = 'TURN_END';
  setDeadline(ctx, at);
}

/* ───────────────────────────── Resolución de casilla ──────────────────────── */

function resolveTile(ctx: Ctx, playerId: string, at: number) {
  const p = getPlayer(ctx.s, playerId);
  if (!p || p.bankrupt) return afterResolution(ctx, at);
  const tile = tileOf(ctx, p.position);
  ctx.s.phase = 'RESOLVING_TILE';
  ctx.events.push({ type: 'tile_resolved', playerId, tileIndex: tile.index });
  const diceSum = (ctx.s.dice?.[0] ?? 0) + (ctx.s.dice?.[1] ?? 0);

  switch (tile.type) {
    case 'GO':
    case 'JAIL':
      return afterResolution(ctx, at);

    case 'FREE_PARKING': {
      if (ctx.s.settings.vacationCash && ctx.s.freeParkingPot > 0) {
        const pot = ctx.s.freeParkingPot;
        ctx.s.freeParkingPot = 0;
        credit(ctx, playerId, pot, 'free_parking');
        log(ctx, 'log.free_parking', { amount: pot }, playerId);
      }
      return afterResolution(ctx, at);
    }

    case 'GOTO_JAIL':
      return sendToJail(ctx, playerId, at);

    case 'TAX': {
      const amount = tile.amount ?? 0;
      log(ctx, 'log.tax', { amount }, playerId);
      charge(ctx, playerId, amount, null, 'TAX');
      if (!ctx.s.debt) return afterResolution(ctx, at);
      return;
    }

    case 'CHANCE':
    case 'CHEST': {
      const deck = tile.type === 'CHANCE' ? 'CHANCE' : 'CHEST';
      const cardId = drawCard(ctx, deck);
      ctx.s.pendingCard = { deck, cardId };
      ctx.s.phase = 'RESOLVING_TILE';
      ctx.events.push({ type: 'card_drawn', deck, cardId, playerId });
      log(ctx, 'log.card_drawn', { deck: deck.toLowerCase() }, playerId);
      setDeadline(ctx, at);
      return;
    }

    case 'PROPERTY':
    case 'RAIL':
    case 'UTILITY': {
      if (!tile.ownerId) {
        ctx.s.pendingPurchase = { tileIndex: tile.index };
        ctx.s.phase = 'AWAITING_ACTION';
        setDeadline(ctx, at);
        return;
      }
      if (tile.ownerId === playerId) return afterResolution(ctx, at);
      if (tile.mortgaged) {
        log(ctx, 'log.mortgaged_no_rent', { tile: tile.name }, playerId);
        return afterResolution(ctx, at);
      }
      const owner = getPlayer(ctx.s, tile.ownerId);
      if (!owner || owner.bankrupt) return afterResolution(ctx, at);
      const rent = calcRent(ctx.s, tile, diceSum, ctx.s.forcedRent?.kind ?? null);
      ctx.s.forcedRent = null;
      log(ctx, 'log.pay_rent', { amount: rent, tile: tile.name, owner: owner.nick }, playerId);
      charge(ctx, playerId, rent, owner.id, 'RENT');
      if (!ctx.s.debt) return afterResolution(ctx, at);
      return;
    }
  }
}

/* ────────────────────────────────── Cartas ───────────────────────────────── */

function drawCard(ctx: Ctx, deck: 'CHANCE' | 'CHEST'): string {
  const key = deck === 'CHANCE' ? 'chance' : 'chest';
  if (ctx.s.decks[key].length === 0) {
    const source = ctx.s.discards[key].length
      ? ctx.s.discards[key]
      : (deck === 'CHANCE' ? CHANCE_CARDS : CHEST_CARDS).map((c) => c.id);
    const sh = shuffle(source, ctx.s.rng);
    ctx.s.rng = sh.seed;
    ctx.s.decks[key] = sh.value;
    ctx.s.discards[key] = [];
  }
  return ctx.s.decks[key].shift()!;
}

function applyCard(ctx: Ctx, playerId: string, card: Card, at: number) {
  const p = getPlayer(ctx.s, playerId)!;
  const others = activePlayers(ctx.s).filter((o) => o.id !== playerId);
  const e = card.effect;

  switch (e.kind) {
    case 'MOVE_TO':
      moveTo(ctx, playerId, e.index, e.collectGo, at);
      ctx.s.phase = 'MOVING';
      return;
    case 'MOVE_REL':
      moveSteps(ctx, playerId, e.steps, at);
      ctx.s.phase = 'MOVING';
      return;
    case 'MOVE_NEAREST': {
      const targets = ctx.s.board.filter((t) => t.type === e.target).map((t) => t.index);
      let best = targets[0];
      let bestDist = BOARD_SIZE + 1;
      for (const t of targets) {
        const d = (t - p.position + BOARD_SIZE) % BOARD_SIZE;
        if (d > 0 && d < bestDist) {
          bestDist = d;
          best = t;
        }
      }
      if (e.forcedRent) {
        ctx.s.forcedRent = { kind: e.target === 'RAIL' ? 'RAIL_X2' : 'UTILITY_X10' };
      }
      moveTo(ctx, playerId, best, true, at);
      ctx.s.phase = 'MOVING';
      return;
    }
    case 'COLLECT':
      credit(ctx, playerId, e.amount, 'card');
      return afterResolution(ctx, at);
    case 'PAY':
      charge(ctx, playerId, e.amount, null, 'CARD');
      if (!ctx.s.debt) return afterResolution(ctx, at);
      return;
    case 'COLLECT_EACH': {
      let total = 0;
      for (const o of others) {
        const take = Math.min(o.money, e.amount);
        o.money -= take;
        ctx.events.push({ type: 'money_changed', playerId: o.id, delta: -take, reason: 'card' });
        total += take;
      }
      credit(ctx, playerId, total, 'card');
      return afterResolution(ctx, at);
    }
    case 'PAY_EACH': {
      const total = e.amount * others.length;
      charge(ctx, playerId, total, null, 'CARD', others.map((o) => o.id));
      if (!ctx.s.debt) return afterResolution(ctx, at);
      return;
    }
    case 'GOTO_JAIL':
      return sendToJail(ctx, playerId, at);
    case 'GET_OUT_CARD':
      p.getOutCards += 1;
      log(ctx, 'log.get_out_card', {}, playerId);
      return afterResolution(ctx, at);
    case 'REPAIRS': {
      let total = 0;
      for (const idx of p.properties) {
        const t = ctx.s.board[idx];
        const h = t.houses ?? 0;
        if (h === 5) total += e.perHotel;
        else total += h * e.perHouse;
      }
      log(ctx, 'log.repairs', { amount: total }, playerId);
      charge(ctx, playerId, total, null, 'CARD');
      if (!ctx.s.debt) return afterResolution(ctx, at);
      return;
    }
  }
}

/* ─────────────────────────── Fin de resolución/turno ──────────────────────── */

function afterResolution(ctx: Ctx, at: number) {
  ctx.s.forcedRent = null;
  if (ctx.s.phase === 'GAME_OVER') return;
  const p = currentPlayer(ctx.s);
  if (!p) return;
  if (p.bankrupt) {
    advanceTurn(ctx, at);
    return;
  }
  const isDoubles = !!ctx.s.dice && ctx.s.dice[0] === ctx.s.dice[1];
  if (isDoubles && !p.inJail && ctx.s.doublesCount > 0 && ctx.s.doublesCount < 3) {
    ctx.s.phase = 'ROLLING';
    log(ctx, 'log.extra_roll', {}, p.id);
  } else {
    ctx.s.phase = 'TURN_END';
  }
  setDeadline(ctx, at);
}

function advanceTurn(ctx: Ctx, at: number) {
  if (checkGameOver(ctx)) return;
  const n = ctx.s.order.length;
  for (let i = 1; i <= n; i++) {
    const idx = (ctx.s.turnIndex + i) % n;
    const p = getPlayer(ctx.s, ctx.s.order[idx]);
    if (p && !p.bankrupt) {
      ctx.s.turnIndex = idx;
      break;
    }
  }
  ctx.s.dice = null;
  ctx.s.doublesCount = 0;
  ctx.s.pendingPurchase = null;
  ctx.s.pendingCard = null;
  ctx.s.lastMove = null;
  ctx.s.resolveAt = null;
  ctx.s.phase = 'ROLLING';
  setDeadline(ctx, at);
  const cur = currentPlayer(ctx.s);
  if (cur) log(ctx, 'log.turn_start', {}, cur.id);
}

function checkGameOver(ctx: Ctx): boolean {
  const alive = activePlayers(ctx.s);
  if (alive.length <= 1 && ctx.s.startedAt !== null) {
    ctx.s.phase = 'GAME_OVER';
    ctx.s.winnerId = alive[0]?.id ?? null;
    ctx.s.turnDeadline = null;
    ctx.events.push({ type: 'game_over', winnerId: ctx.s.winnerId });
    log(ctx, 'log.game_over', {}, ctx.s.winnerId ?? undefined);
    return true;
  }
  return false;
}

/* ──────────────────────────────── Quiebra ───────────────────────────────── */

function goBankrupt(ctx: Ctx, debtorId: string, creditorId: string | null) {
  const debtor = getPlayer(ctx.s, debtorId);
  if (!debtor || debtor.bankrupt) return;
  const creditor = creditorId ? getPlayer(ctx.s, creditorId) : null;

  for (const idx of [...debtor.properties]) {
    const t = ctx.s.board[idx];
    const houses = t.houses ?? 0;
    if (houses > 0 && creditor) {
      // Las construcciones se liquidan al banco a mitad de precio
      credit(ctx, creditor.id, Math.floor((houses * (t.houseCost ?? 0)) / 2), 'bankruptcy');
    }
    t.houses = 0;
    if (creditor) {
      t.ownerId = creditor.id;
      creditor.properties.push(idx);
    } else {
      t.ownerId = null;
      t.mortgaged = false;
    }
  }
  if (creditor) {
    credit(ctx, creditor.id, debtor.money, 'bankruptcy');
    creditor.getOutCards += debtor.getOutCards;
  }

  debtor.money = 0;
  debtor.properties = [];
  debtor.getOutCards = 0;
  debtor.bankrupt = true;
  debtor.inJail = false;
  ctx.s.debt = null;
  ctx.s.pendingPurchase = null;
  ctx.s.pendingCard = null;
  // Los intercambios abiertos del jugador quebrado se cancelan
  for (const tr of ctx.s.trades) {
    if (tr.status === 'PENDING' && (tr.from.playerId === debtorId || tr.to.playerId === debtorId)) {
      tr.status = 'CANCELLED';
    }
  }
  ctx.events.push({ type: 'player_bankrupt', playerId: debtorId, creditorId });
  log(ctx, 'log.bankrupt', { creditor: creditor?.nick ?? 'banco' }, debtorId);

  // Si estaba pujando, sale de la subasta; si no queda nadie, se resuelve ya
  const a = ctx.s.auction;
  if (a && a.activeBidders.includes(debtorId)) {
    a.activeBidders = a.activeBidders.filter((id) => id !== debtorId);
    if (a.highestBidderId === debtorId) {
      a.highestBidderId = null;
      a.highestBid = 0;
    }
    const soloQuedaElGanador =
      a.activeBidders.length === 1 && a.activeBidders[0] === a.highestBidderId;
    if (a.activeBidders.length === 0 || soloQuedaElGanador) {
      resolveAuction(ctx, Date.now());
      return;
    }
  }

  checkGameOver(ctx);
}

/** Si el jugador endeudado ya reunió el efectivo, se salda la deuda sola. */
function trySettleDebt(ctx: Ctx, at: number): boolean {
  const d = ctx.s.debt;
  if (!d) return false;
  const p = getPlayer(ctx.s, d.debtorId);
  if (!p) return false;
  if (p.money < d.amount) return false;
  p.money -= d.amount;
  ctx.events.push({ type: 'money_changed', playerId: p.id, delta: -d.amount, reason: d.reason });
  payOut(ctx, d.amount, d.creditorId, d.distributeTo, d.reason);
  ctx.s.debt = null;
  log(ctx, 'log.debt_settled', { amount: d.amount }, p.id);
  if (ctx.s.order[ctx.s.turnIndex] === p.id) afterResolution(ctx, at);
  else ctx.s.phase = ctx.s.pendingPurchase ? 'AWAITING_ACTION' : 'TURN_END';
  return true;
}

/* ──────────────────────────────── Subastas ──────────────────────────────── */

function startAuction(ctx: Ctx, tileIndex: number, at: number) {
  const bidders = activePlayers(ctx.s).map((p) => p.id);
  ctx.s.auction = {
    tileIndex,
    highestBid: 0,
    highestBidderId: null,
    activeBidders: bidders,
    deadline: at + ctx.s.settings.auctionTimer * 1000,
    history: [],
  };
  ctx.s.pendingPurchase = null;
  ctx.s.phase = 'AUCTION';
  ctx.s.turnDeadline = null;
  ctx.events.push({ type: 'auction_started', tileIndex });
  log(ctx, 'log.auction_started', { tile: ctx.s.board[tileIndex].name });
}

function resolveAuction(ctx: Ctx, at: number) {
  const a = ctx.s.auction;
  if (!a) return;
  const tile = ctx.s.board[a.tileIndex];
  if (a.highestBidderId && a.highestBid > 0) {
    const winner = getPlayer(ctx.s, a.highestBidderId)!;
    winner.money -= a.highestBid;
    ctx.events.push({
      type: 'money_changed',
      playerId: winner.id,
      delta: -a.highestBid,
      reason: 'auction',
    });
    tile.ownerId = winner.id;
    winner.properties.push(tile.index);
    winner.properties.sort((x, y) => x - y);
    log(ctx, 'log.auction_won', { tile: tile.name, amount: a.highestBid }, winner.id);
    ctx.events.push({
      type: 'auction_won',
      playerId: winner.id,
      tileIndex: tile.index,
      amount: a.highestBid,
    });
  } else {
    log(ctx, 'log.auction_empty', { tile: tile.name });
    ctx.events.push({ type: 'auction_won', playerId: null, tileIndex: tile.index, amount: 0 });
  }
  ctx.s.auction = null;
  afterResolution(ctx, at);
}

/* ──────────────────────────────── Reducer ───────────────────────────────── */

function fail(state: GameState, error: string): ReduceResult {
  return { state, events: [], error };
}

export function reduce(state: GameState, action: Action): ReduceResult {
  const s: GameState = structuredClone(state);
  const ctx: Ctx = { s, events: [] };
  const at = 'at' in action ? action.at : Date.now();

  switch (action.type) {
    /* ───────────────── Lobby ───────────────── */
    case 'JOIN': {
      if (s.phase !== 'LOBBY') {
        // Reingreso de un jugador existente (reconexión)
        const existing = getPlayer(s, action.playerId);
        if (!existing) return fail(state, 'game_in_progress');
        existing.connected = true;
        existing.disconnectedAt = null;
        return { state: s, events: ctx.events };
      }
      if (getPlayer(s, action.playerId)) {
        const p = getPlayer(s, action.playerId)!;
        p.connected = true;
        p.disconnectedAt = null;
        return { state: s, events: ctx.events };
      }
      if (s.players.length >= s.settings.maxPlayers) return fail(state, 'room_full');
      const used = new Set(s.players.map((p) => p.color));
      const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0];
      const player: Player = {
        id: action.playerId,
        nick: action.nick.slice(0, 16),
        avatar: action.avatar,
        color,
        money: s.settings.startingCash,
        position: 0,
        properties: [],
        jailTurns: 0,
        inJail: false,
        getOutCards: 0,
        bankrupt: false,
        isBot: !!action.isBot,
        connected: true,
        disconnectedAt: null,
      };
      s.players.push(player);
      if (!s.hostId || !getPlayer(s, s.hostId)) s.hostId = player.id;
      log(ctx, 'log.joined', { nick: player.nick }, player.id);
      return { state: s, events: ctx.events };
    }

    case 'ADD_BOT': {
      if (s.phase !== 'LOBBY') return fail(state, 'not_lobby');
      if (action.playerId !== s.hostId) return fail(state, 'not_host');
      if (s.players.length >= s.settings.maxPlayers) return fail(state, 'room_full');
      const n = s.players.filter((p) => p.isBot).length + 1;
      const names = ['Nova', 'Tito', 'Cobre', 'Mistral', 'Bruma', 'Quilla', 'Faro', 'Duna'];
      const id = `bot_${n}_${Math.abs(s.rng % 9973)}`;
      const used = new Set(s.players.map((p) => p.color));
      const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0];
      s.players.push({
        id,
        nick: names[(n - 1) % names.length],
        avatar: `bot-${((n - 1) % 6) + 1}`,
        color,
        money: s.settings.startingCash,
        position: 0,
        properties: [],
        jailTurns: 0,
        inJail: false,
        getOutCards: 0,
        bankrupt: false,
        isBot: true,
        connected: true,
      });
      s.settings.botCount = s.players.filter((p) => p.isBot).length;
      log(ctx, 'log.bot_added', {}, id);
      return { state: s, events: ctx.events };
    }

    case 'KICK_PLAYER': {
      if (action.playerId !== s.hostId) return fail(state, 'not_host');
      if (s.phase !== 'LOBBY') return fail(state, 'not_lobby');
      s.players = s.players.filter((p) => p.id !== action.targetId);
      return { state: s, events: ctx.events };
    }

    case 'LEAVE': {
      if (s.phase === 'LOBBY') {
        s.players = s.players.filter((p) => p.id !== action.playerId);
        if (s.hostId === action.playerId && s.players.length) s.hostId = s.players[0].id;
      } else {
        const p = getPlayer(s, action.playerId);
        if (p) {
          p.connected = false;
          p.disconnectedAt = Date.now();
        }
      }
      return { state: s, events: ctx.events };
    }

    case 'SET_CONNECTED': {
      const p = getPlayer(s, action.playerId);
      if (!p) return fail(state, 'no_player');
      p.connected = action.connected;
      p.disconnectedAt = action.connected ? null : action.at;
      return { state: s, events: ctx.events };
    }

    case 'SET_SETTINGS': {
      if (s.phase !== 'LOBBY') return fail(state, 'not_lobby');
      if (action.playerId !== s.hostId) return fail(state, 'not_host');
      const next = { ...s.settings, ...action.settings };
      next.startingCash = clamp(next.startingCash, 200, 50_000);
      next.maxPlayers = clamp(next.maxPlayers, 2, 8);
      next.turnTimer = clamp(next.turnTimer, 0, 600);
      next.auctionTimer = clamp(next.auctionTimer, 5, 60);
      next.bidIncrement = clamp(next.bidIncrement, 1, 500);
      next.goSalary = clamp(next.goSalary, 0, 5000);
      next.bailAmount = clamp(next.bailAmount, 0, 5000);
      s.settings = next;
      for (const p of s.players) p.money = next.startingCash;
      return { state: s, events: ctx.events };
    }

    case 'START_GAME': {
      if (s.phase !== 'LOBBY') return fail(state, 'not_lobby');
      if (action.playerId !== s.hostId) return fail(state, 'not_host');
      if (s.players.length < 2) return fail(state, 'need_players');
      let order = s.players.map((p) => p.id);
      if (s.settings.randomizeOrder) {
        const sh = shuffle(order, s.rng);
        s.rng = sh.seed;
        order = sh.value;
      }
      s.order = order;
      s.turnIndex = 0;
      for (const p of s.players) {
        p.money = s.settings.startingCash;
        p.position = 0;
        p.properties = [];
        p.inJail = false;
        p.jailTurns = 0;
        p.getOutCards = 0;
        p.bankrupt = false;
      }
      const c1 = shuffle(CHANCE_CARDS.map((c) => c.id), s.rng);
      const c2 = shuffle(CHEST_CARDS.map((c) => c.id), c1.seed);
      s.rng = c2.seed;
      s.decks = { chance: c1.value, chest: c2.value };
      s.discards = { chance: [], chest: [] };
      s.phase = 'ROLLING';
      s.startedAt = at;
      setDeadline(ctx, at);
      log(ctx, 'log.game_started', {});
      const cur = currentPlayer(s);
      if (cur) log(ctx, 'log.turn_start', {}, cur.id);
      return { state: s, events: ctx.events };
    }

    /* ───────────────── Turno ───────────────── */
    case 'ROLL_DICE': {
      if (s.phase !== 'ROLLING') return fail(state, 'wrong_phase');
      if (s.order[s.turnIndex] !== action.playerId) return fail(state, 'not_your_turn');
      const p = getPlayer(s, action.playerId)!;
      const [d1, d2] = roll(ctx);
      s.dice = [d1, d2];
      ctx.events.push({ type: 'dice_rolled', d1, d2, playerId: p.id });
      log(ctx, 'log.rolled', { d1, d2 }, p.id);
      const doubles = d1 === d2;

      if (p.inJail) {
        if (doubles) {
          p.inJail = false;
          p.jailTurns = 0;
          log(ctx, 'log.jail_doubles', {}, p.id);
          s.phase = 'MOVING';
          moveSteps(ctx, p.id, d1 + d2, at);
          // Salir con dobles no concede tirada extra
          s.doublesCount = 0;
          return { state: s, events: ctx.events };
        }
        p.jailTurns += 1;
        if (p.jailTurns >= 3) {
          log(ctx, 'log.jail_forced_bail', { amount: s.settings.bailAmount }, p.id);
          charge(ctx, p.id, s.settings.bailAmount, null, 'BAIL');
          p.inJail = false;
          p.jailTurns = 0;
          // Si no le alcanzó, primero resuelve la deuda; el turno termina sin mover
          if (s.debt) return { state: s, events: ctx.events };
          s.phase = 'MOVING';
          moveSteps(ctx, p.id, d1 + d2, at);
          return { state: s, events: ctx.events };
        }
        log(ctx, 'log.jail_failed', { left: 3 - p.jailTurns }, p.id);
        s.phase = 'TURN_END';
        setDeadline(ctx, at);
        return { state: s, events: ctx.events };
      }

      if (doubles) {
        s.doublesCount += 1;
        if (s.doublesCount >= 3) {
          log(ctx, 'log.three_doubles', {}, p.id);
          sendToJail(ctx, p.id, at);
          return { state: s, events: ctx.events };
        }
      } else {
        s.doublesCount = 0;
      }

      s.phase = 'MOVING';
      moveSteps(ctx, p.id, d1 + d2, at);
      return { state: s, events: ctx.events };
    }

    case 'RESOLVE_MOVE': {
      if (s.phase !== 'MOVING') return fail(state, 'wrong_phase');
      const p = currentPlayer(s);
      if (!p) return fail(state, 'no_player');
      s.resolveAt = null;
      resolveTile(ctx, p.id, at);
      return { state: s, events: ctx.events };
    }

    case 'ACK_CARD': {
      if (!s.pendingCard) return fail(state, 'no_card');
      if (s.order[s.turnIndex] !== action.playerId) return fail(state, 'not_your_turn');
      const { deck, cardId } = s.pendingCard;
      s.pendingCard = null;
      s.discards[deck === 'CHANCE' ? 'chance' : 'chest'].push(cardId);
      applyCard(ctx, action.playerId, getCard(cardId), at);
      return { state: s, events: ctx.events };
    }

    case 'BUY_PROPERTY': {
      if (s.phase !== 'AWAITING_ACTION' || !s.pendingPurchase) return fail(state, 'wrong_phase');
      if (s.order[s.turnIndex] !== action.playerId) return fail(state, 'not_your_turn');
      const tile = s.board[s.pendingPurchase.tileIndex];
      const p = getPlayer(s, action.playerId)!;
      const price = tile.price ?? 0;
      if (p.money < price) return fail(state, 'no_money');
      p.money -= price;
      ctx.events.push({ type: 'money_changed', playerId: p.id, delta: -price, reason: 'buy' });
      tile.ownerId = p.id;
      p.properties.push(tile.index);
      p.properties.sort((a, b) => a - b);
      s.pendingPurchase = null;
      log(ctx, 'log.bought', { tile: tile.name, amount: price }, p.id);
      afterResolution(ctx, at);
      return { state: s, events: ctx.events };
    }

    case 'DECLINE_PURCHASE': {
      if (s.phase !== 'AWAITING_ACTION' || !s.pendingPurchase) return fail(state, 'wrong_phase');
      if (s.order[s.turnIndex] !== action.playerId) return fail(state, 'not_your_turn');
      const idx = s.pendingPurchase.tileIndex;
      s.pendingPurchase = null;
      if (s.settings.allowAuctions) startAuction(ctx, idx, at);
      else afterResolution(ctx, at);
      return { state: s, events: ctx.events };
    }

    case 'END_TURN': {
      if (s.phase !== 'TURN_END') return fail(state, 'wrong_phase');
      if (s.order[s.turnIndex] !== action.playerId) return fail(state, 'not_your_turn');
      advanceTurn(ctx, at);
      return { state: s, events: ctx.events };
    }

    /* ───────────────── Cárcel ───────────────── */
    case 'PAY_BAIL': {
      if (s.order[s.turnIndex] !== action.playerId) return fail(state, 'not_your_turn');
      if (s.phase !== 'ROLLING') return fail(state, 'wrong_phase');
      const p = getPlayer(s, action.playerId)!;
      if (!p.inJail) return fail(state, 'not_in_jail');
      if (p.money < s.settings.bailAmount) return fail(state, 'no_money');
      charge(ctx, p.id, s.settings.bailAmount, null, 'BAIL');
      p.inJail = false;
      p.jailTurns = 0;
      log(ctx, 'log.paid_bail', { amount: s.settings.bailAmount }, p.id);
      return { state: s, events: ctx.events };
    }

    case 'USE_JAIL_CARD': {
      if (s.order[s.turnIndex] !== action.playerId) return fail(state, 'not_your_turn');
      const p = getPlayer(s, action.playerId)!;
      if (!p.inJail) return fail(state, 'not_in_jail');
      if (p.getOutCards <= 0) return fail(state, 'no_card');
      p.getOutCards -= 1;
      p.inJail = false;
      p.jailTurns = 0;
      log(ctx, 'log.used_jail_card', {}, p.id);
      return { state: s, events: ctx.events };
    }

    /* ───────────────── Gestión de propiedades ───────────────── */
    case 'BUILD_HOUSE': {
      if (!canManage(s, action.playerId)) return fail(state, 'wrong_phase');
      const err = canBuildHouse(s, action.playerId, action.tileIndex);
      if (err) return fail(state, err);
      const tile = s.board[action.tileIndex];
      const p = getPlayer(s, action.playerId)!;
      p.money -= tile.houseCost!;
      ctx.events.push({
        type: 'money_changed',
        playerId: p.id,
        delta: -tile.houseCost!,
        reason: 'build',
      });
      tile.houses = (tile.houses ?? 0) + 1;
      log(ctx, tile.houses === 5 ? 'log.built_hotel' : 'log.built_house', { tile: tile.name }, p.id);
      return { state: s, events: ctx.events };
    }

    case 'SELL_HOUSE': {
      if (!canLiquidate(s, action.playerId)) return fail(state, 'wrong_phase');
      const err = canSellHouse(s, action.playerId, action.tileIndex);
      if (err) return fail(state, err);
      const tile = s.board[action.tileIndex];
      const p = getPlayer(s, action.playerId)!;
      tile.houses = (tile.houses ?? 0) - 1;
      const refund = Math.floor((tile.houseCost ?? 0) / 2);
      credit(ctx, p.id, refund, 'sell_house');
      log(ctx, 'log.sold_house', { tile: tile.name, amount: refund }, p.id);
      trySettleDebt(ctx, at);
      return { state: s, events: ctx.events };
    }

    case 'MORTGAGE': {
      if (!s.settings.mortgageEnabled) return fail(state, 'mortgage_disabled');
      if (!canLiquidate(s, action.playerId)) return fail(state, 'wrong_phase');
      const tile = s.board[action.tileIndex];
      if (!tile || tile.ownerId !== action.playerId) return fail(state, 'not_owner');
      if (tile.mortgaged) return fail(state, 'already_mortgaged');
      if ((tile.houses ?? 0) > 0) return fail(state, 'has_houses');
      tile.mortgaged = true;
      credit(ctx, action.playerId, tile.mortgageValue ?? 0, 'mortgage');
      log(ctx, 'log.mortgaged', { tile: tile.name, amount: tile.mortgageValue ?? 0 }, action.playerId);
      trySettleDebt(ctx, at);
      return { state: s, events: ctx.events };
    }

    case 'UNMORTGAGE': {
      if (!s.settings.mortgageEnabled) return fail(state, 'mortgage_disabled');
      if (!canLiquidate(s, action.playerId)) return fail(state, 'wrong_phase');
      const tile = s.board[action.tileIndex];
      if (!tile || tile.ownerId !== action.playerId) return fail(state, 'not_owner');
      if (!tile.mortgaged) return fail(state, 'not_mortgaged');
      const cost = Math.ceil(((tile.mortgageValue ?? 0) * 11) / 10);
      const p = getPlayer(s, action.playerId)!;
      if (p.money < cost) return fail(state, 'no_money');
      p.money -= cost;
      ctx.events.push({ type: 'money_changed', playerId: p.id, delta: -cost, reason: 'unmortgage' });
      tile.mortgaged = false;
      log(ctx, 'log.unmortgaged', { tile: tile.name, amount: cost }, p.id);
      return { state: s, events: ctx.events };
    }

    /* ───────────────── Subasta ───────────────── */
    case 'BID': {
      if (s.phase !== 'AUCTION' || !s.auction) return fail(state, 'wrong_phase');
      const a = s.auction;
      if (!a.activeBidders.includes(action.playerId)) return fail(state, 'not_bidding');
      const p = getPlayer(s, action.playerId)!;
      const min = a.highestBid + s.settings.bidIncrement;
      const amount = Math.floor(action.amount);
      if (amount < min) return fail(state, 'bid_too_low');
      if (amount > p.money) return fail(state, 'no_money');
      a.highestBid = amount;
      a.highestBidderId = p.id;
      a.history.push({ playerId: p.id, amount });
      a.deadline = at + s.settings.auctionTimer * 1000;
      ctx.events.push({ type: 'auction_bid', playerId: p.id, amount });
      log(ctx, 'log.bid', { amount }, p.id);
      return { state: s, events: ctx.events };
    }

    case 'PASS_BID': {
      if (s.phase !== 'AUCTION' || !s.auction) return fail(state, 'wrong_phase');
      const a = s.auction;
      if (!a.activeBidders.includes(action.playerId)) return fail(state, 'not_bidding');
      a.activeBidders = a.activeBidders.filter((id) => id !== action.playerId);
      log(ctx, 'log.passed', {}, action.playerId);
      const onlyWinnerLeft =
        a.activeBidders.length === 1 && a.activeBidders[0] === a.highestBidderId;
      if (a.activeBidders.length === 0 || onlyWinnerLeft) resolveAuction(ctx, at);
      return { state: s, events: ctx.events };
    }

    /* ───────────────── Intercambios ───────────────── */
    case 'PROPOSE_TRADE': {
      if (s.phase === 'LOBBY' || s.phase === 'GAME_OVER') return fail(state, 'wrong_phase');
      const from = getPlayer(s, action.playerId);
      const to = getPlayer(s, action.to);
      if (!from || !to || from.bankrupt || to.bankrupt) return fail(state, 'no_player');
      if (from.id === to.id) return fail(state, 'self_trade');
      const err =
        validateSide(s, from, action.offer) ?? validateSide(s, to, action.request);
      if (err) return fail(state, err);
      if (s.trades.filter((t) => t.status === 'PENDING' && t.from.playerId === from.id).length >= 3)
        return fail(state, 'too_many_trades');
      if (action.counterOf) {
        const prev = s.trades.find((t) => t.id === action.counterOf);
        if (prev && prev.status === 'PENDING') prev.status = 'REJECTED';
      }
      s.trades.push({
        id: action.tradeId,
        from: { playerId: from.id, ...action.offer },
        to: { playerId: to.id, ...action.request },
        status: 'PENDING',
        createdAt: at,
        counterOf: action.counterOf ?? null,
      });
      ctx.events.push({ type: 'trade_proposed', tradeId: action.tradeId });
      log(ctx, 'log.trade_proposed', { to: to.nick }, from.id);
      return { state: s, events: ctx.events };
    }

    case 'RESPOND_TRADE': {
      const trade = s.trades.find((t) => t.id === action.tradeId);
      if (!trade || trade.status !== 'PENDING') return fail(state, 'no_trade');
      if (trade.to.playerId !== action.playerId) return fail(state, 'not_recipient');
      if (!action.accept) {
        trade.status = 'REJECTED';
        ctx.events.push({ type: 'trade_resolved', tradeId: trade.id, accepted: false });
        log(ctx, 'log.trade_rejected', {}, action.playerId);
        return { state: s, events: ctx.events };
      }
      const from = getPlayer(s, trade.from.playerId);
      const to = getPlayer(s, trade.to.playerId);
      if (!from || !to) return fail(state, 'no_player');
      const err = validateSide(s, from, trade.from) ?? validateSide(s, to, trade.to);
      if (err) {
        trade.status = 'CANCELLED';
        return fail(state, err);
      }
      transferSide(ctx, from, to, trade.from);
      transferSide(ctx, to, from, trade.to);
      trade.status = 'ACCEPTED';
      ctx.events.push({ type: 'trade_resolved', tradeId: trade.id, accepted: true });
      log(ctx, 'log.trade_accepted', { a: from.nick, b: to.nick });
      trySettleDebt(ctx, at);
      return { state: s, events: ctx.events };
    }

    case 'CANCEL_TRADE': {
      const trade = s.trades.find((t) => t.id === action.tradeId);
      if (!trade || trade.status !== 'PENDING') return fail(state, 'no_trade');
      if (trade.from.playerId !== action.playerId) return fail(state, 'not_proposer');
      trade.status = 'CANCELLED';
      return { state: s, events: ctx.events };
    }

    /* ───────────────── Quiebra y reloj ───────────────── */
    case 'DECLARE_BANKRUPTCY': {
      const p = getPlayer(s, action.playerId);
      if (!p || p.bankrupt) return fail(state, 'no_player');
      if (s.phase === 'LOBBY' || s.phase === 'GAME_OVER') return fail(state, 'wrong_phase');
      // Rendirse es válido en cualquier momento: si no hay deuda, los activos
      // vuelven al banco en vez de pasar a un acreedor.
      const d = s.debt;
      const creditorId = d && d.debtorId === action.playerId ? d.creditorId : null;
      goBankrupt(ctx, action.playerId, creditorId);
      // `goBankrupt` puede terminar la partida; se relee la fase por `ctx`
      // porque TypeScript no ve esa mutación a través de `s`.
      if (ctx.s.phase === 'GAME_OVER') return { state: s, events: ctx.events };
      // Sólo se toca el turno si quien abandona era el jugador en turno;
      // rendirse desde la banca no debe interrumpir a quien está jugando.
      if (s.order[s.turnIndex] === action.playerId) advanceTurn(ctx, at);
      return { state: s, events: ctx.events };
    }

    case 'TICK':
      return tick(ctx, action.at);
  }

  return { state: s, events: ctx.events };
}

/* ───────────────────────────── Helpers privados ──────────────────────────── */

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.floor(v)));
}

/**
 * Liquidar activos (hipotecar, deshipotecar, vender casas) se permite en
 * cualquier momento de la partida: es la única forma de reunir efectivo
 * cuando la renta cae encima estando fuera de turno.
 */
function canLiquidate(s: GameState, playerId: string): boolean {
  if (s.phase === 'LOBBY' || s.phase === 'GAME_OVER') return false;
  const p = getPlayer(s, playerId);
  return !!p && !p.bankrupt;
}

/** Construir sí exige turno propio y una fase tranquila */
function canManage(s: GameState, playerId: string): boolean {
  if (!canLiquidate(s, playerId)) return false;
  if (s.debt && s.debt.debtorId === playerId) return true;
  if (s.order[s.turnIndex] !== playerId) return false;
  return s.phase === 'ROLLING' || s.phase === 'TURN_END' || s.phase === 'AWAITING_ACTION';
}

function validateSide(
  s: GameState,
  player: Player,
  side: { money: number; properties: number[]; getOutCards: number },
): string | null {
  if (side.money < 0 || side.getOutCards < 0) return 'invalid_trade';
  if (player.money < side.money) return 'trade_no_money';
  if (player.getOutCards < side.getOutCards) return 'trade_no_cards';
  for (const idx of side.properties) {
    const t = s.board[idx];
    if (!t || t.ownerId !== player.id) return 'trade_not_owner';
    if ((t.houses ?? 0) > 0) return 'trade_has_houses';
  }
  return null;
}

function transferSide(
  ctx: Ctx,
  from: Player,
  to: Player,
  side: { money: number; properties: number[]; getOutCards: number },
) {
  from.money -= side.money;
  to.money += side.money;
  from.getOutCards -= side.getOutCards;
  to.getOutCards += side.getOutCards;
  for (const idx of side.properties) {
    const t = ctx.s.board[idx];
    t.ownerId = to.id;
    from.properties = from.properties.filter((i) => i !== idx);
    to.properties.push(idx);
    to.properties.sort((a, b) => a - b);
  }
}

/**
 * Auto-juego: liquida lo mínimo indispensable para cubrir la deuda;
 * si no alcanza, quiebra. También lo usan los bots y el timer de turno.
 */
function autoResolveDebt(ctx: Ctx, playerId: string, at: number) {
  const d = ctx.s.debt;
  if (!d || d.debtorId !== playerId) return;
  const p = getPlayer(ctx.s, playerId)!;
  // Primero vender construcciones (respetando construcción pareja), luego hipotecar
  let guard = 0;
  while (p.money < d.amount && guard++ < 200) {
    const sellable = ctx.s.board
      .filter((t) => t.ownerId === playerId && (t.houses ?? 0) > 0)
      .filter((t) => !canSellHouse(ctx.s, playerId, t.index))
      .sort((a, b) => (b.houses ?? 0) - (a.houses ?? 0));
    if (sellable.length) {
      const t = sellable[0];
      t.houses = (t.houses ?? 0) - 1;
      credit(ctx, playerId, Math.floor((t.houseCost ?? 0) / 2), 'sell_house');
      continue;
    }
    const mortgageable = ctx.s.board
      .filter((t) => t.ownerId === playerId && !t.mortgaged && (t.houses ?? 0) === 0)
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (mortgageable.length) {
      const t = mortgageable[0];
      t.mortgaged = true;
      credit(ctx, playerId, t.mortgageValue ?? 0, 'mortgage');
      continue;
    }
    break;
  }
  if (!trySettleDebt(ctx, at)) {
    goBankrupt(ctx, playerId, d.creditorId);
    if (ctx.s.phase !== 'GAME_OVER') {
      if (ctx.s.order[ctx.s.turnIndex] === playerId) advanceTurn(ctx, at);
      else ctx.s.phase = 'TURN_END';
    }
  }
}

/* ─────────────────────────────────── TICK ────────────────────────────────── */

function tick(ctx: Ctx, at: number): ReduceResult {
  const s = ctx.s;
  if (s.phase === 'LOBBY' || s.phase === 'GAME_OVER') return { state: s, events: ctx.events };

  // Fin de animación de movimiento → resolver casilla
  if (s.phase === 'MOVING' && s.resolveAt !== null && at >= s.resolveAt) {
    const p = currentPlayer(s);
    s.resolveAt = null;
    if (p) resolveTile(ctx, p.id, at);
    return { state: s, events: ctx.events };
  }

  // Subasta vencida → gana el mayor postor
  if (s.phase === 'AUCTION' && s.auction && at >= s.auction.deadline) {
    resolveAuction(ctx, at);
    return { state: s, events: ctx.events };
  }

  // Intercambios viejos caducan a los 3 minutos
  for (const t of s.trades) {
    if (t.status === 'PENDING' && at - t.createdAt > 180_000) t.status = 'CANCELLED';
  }

  const cur = currentPlayer(s);
  if (!cur) return { state: s, events: ctx.events };

  const disconnectedTooLong =
    !cur.connected && cur.disconnectedAt != null && at - cur.disconnectedAt > DISCONNECT_GRACE_MS;
  const timedOut = s.turnDeadline !== null && at >= s.turnDeadline;
  if (!timedOut && !disconnectedTooLong) return { state: s, events: ctx.events };

  // Auto-juego de la acción mínima
  log(ctx, 'log.autoplay', {}, cur.id);
  switch (s.phase) {
    case 'ROLLING':
      return reduceInto(ctx, { type: 'ROLL_DICE', playerId: cur.id, at });
    case 'RESOLVING_TILE':
      if (s.pendingCard) return reduceInto(ctx, { type: 'ACK_CARD', playerId: cur.id, at });
      return { state: s, events: ctx.events };
    case 'AWAITING_ACTION':
      if (s.debt) {
        autoResolveDebt(ctx, s.debt.debtorId, at);
        return { state: s, events: ctx.events };
      }
      if (s.pendingPurchase)
        return reduceInto(ctx, { type: 'DECLINE_PURCHASE', playerId: cur.id, at });
      return { state: s, events: ctx.events };
    case 'TURN_END':
      return reduceInto(ctx, { type: 'END_TURN', playerId: cur.id, at });
    default:
      return { state: s, events: ctx.events };
  }
}

/** Reaplica una acción sobre el contexto actual conservando los eventos ya emitidos */
function reduceInto(ctx: Ctx, action: Action): ReduceResult {
  const r = reduce(ctx.s, action);
  return { state: r.state, events: [...ctx.events, ...r.events], error: r.error };
}

/* ─────────────────────────── Utilidades públicas ─────────────────────────── */

/** Estado enriquecido con patrimonio neto, listo para enviar al cliente */
export function withDerived(state: GameState): GameState {
  const s = structuredClone(state);
  for (const p of s.players) p.netWorth = netWorth(s, p);
  return s;
}

/** Acciones legales para un jugador en el estado actual (para habilitar la UI) */
export function legalActions(state: GameState, playerId: string): string[] {
  const out: string[] = [];
  const isTurn = state.order[state.turnIndex] === playerId;
  const p = getPlayer(state, playerId);
  if (!p || p.bankrupt) return out;

  if (state.phase === 'LOBBY') {
    if (state.hostId === playerId) out.push('start_game', 'add_bot', 'set_settings', 'kick_player');
    return out;
  }
  if (state.phase === 'AUCTION' && state.auction?.activeBidders.includes(playerId)) {
    out.push('bid', 'pass_bid');
  }
  if (state.debt?.debtorId === playerId) {
    out.push('mortgage', 'sell_house');
  }
  // Rendirse siempre es posible mientras la partida siga en curso
  if (state.phase !== 'GAME_OVER') out.push('declare_bankruptcy');
  if (isTurn) {
    if (state.phase === 'ROLLING') {
      out.push('roll_dice');
      if (p.inJail) {
        if (p.money >= state.settings.bailAmount) out.push('pay_bail');
        if (p.getOutCards > 0) out.push('use_jail_card');
      }
    }
    if (state.phase === 'AWAITING_ACTION' && state.pendingPurchase) {
      const tile = state.board[state.pendingPurchase.tileIndex];
      if (p.money >= (tile.price ?? 0)) out.push('buy_property');
      out.push('decline_purchase');
    }
    if (state.phase === 'RESOLVING_TILE' && state.pendingCard) out.push('ack_card');
    if (state.phase === 'TURN_END') out.push('end_turn');
    if (canManage(state, playerId)) out.push('build_house');
  }
  if (canLiquidate(state, playerId)) out.push('sell_house', 'mortgage', 'unmortgage');
  if (state.phase !== 'GAME_OVER') out.push('propose_trade', 'chat_message');
  return [...new Set(out)];
}
