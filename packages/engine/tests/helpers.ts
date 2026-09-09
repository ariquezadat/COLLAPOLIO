import { createInitialState, reduce } from '../src/reducer.js';
import type { Action, GameSettings, GameState } from '../src/types.js';

export const AT = 1_700_000_000_000;

export function apply(state: GameState, action: Action): GameState {
  const r = reduce(state, action);
  if (r.error) throw new Error(`acción rechazada: ${action.type} → ${r.error}`);
  return r.state;
}

/** Aplica esperando que falle; devuelve el motivo */
export function expectFail(state: GameState, action: Action): string {
  const r = reduce(state, action);
  if (!r.error) throw new Error(`se esperaba rechazo de ${action.type}`);
  return r.error;
}

export function newGame(
  nicks: string[] = ['ana', 'beto'],
  settings: Partial<GameSettings> = {},
): GameState {
  let s = createInitialState({ hostId: nicks[0], settings: { randomizeOrder: false, ...settings }, seed: 42 });
  for (const n of nicks) {
    s = apply(s, { type: 'JOIN', playerId: n, nick: n, avatar: 'a1' });
  }
  s = apply(s, { type: 'START_GAME', playerId: nicks[0], at: AT });
  return s;
}

/** Tira los dados con un resultado forzado y resuelve la casilla de destino */
export function rollAndResolve(state: GameState, d1: number, d2: number): GameState {
  const s = { ...state, _forcedDice: [d1, d2] as [number, number] };
  const rolled = apply(s, { type: 'ROLL_DICE', playerId: state.order[state.turnIndex], at: AT });
  if (rolled.phase !== 'MOVING') return rolled;
  return apply(rolled, { type: 'RESOLVE_MOVE', at: AT });
}

export function setPosition(state: GameState, playerId: string, index: number): GameState {
  const s = structuredClone(state);
  s.players.find((p) => p.id === playerId)!.position = index;
  return s;
}

export function setMoney(state: GameState, playerId: string, money: number): GameState {
  const s = structuredClone(state);
  s.players.find((p) => p.id === playerId)!.money = money;
  return s;
}

/** Asigna propiedades directamente, saltándose la compra */
export function giveTiles(state: GameState, playerId: string, indices: number[]): GameState {
  const s = structuredClone(state);
  const p = s.players.find((x) => x.id === playerId)!;
  for (const i of indices) {
    const t = s.board[i];
    if (t.ownerId) {
      const prev = s.players.find((x) => x.id === t.ownerId);
      if (prev) prev.properties = prev.properties.filter((x) => x !== i);
    }
    t.ownerId = playerId;
    if (!p.properties.includes(i)) p.properties.push(i);
  }
  p.properties.sort((a, b) => a - b);
  return s;
}

export function money(state: GameState, playerId: string): number {
  return state.players.find((p) => p.id === playerId)!.money;
}

export function tile(state: GameState, i: number) {
  return state.board[i];
}

/**
 * Resuelve automáticamente todo lo que quede pendiente (animación, carta,
 * compra, subasta) hasta llegar a ROLLING o TURN_END.
 */
export function settle(state: GameState): GameState {
  let s = state;
  for (let guard = 0; guard < 60; guard++) {
    const cur = s.order[s.turnIndex];
    if (s.phase === 'MOVING') { s = apply(s, { type: 'RESOLVE_MOVE', at: AT }); continue; }
    if (s.phase === 'RESOLVING_TILE' && s.pendingCard) {
      s = apply(s, { type: 'ACK_CARD', playerId: cur, at: AT });
      continue;
    }
    if (s.phase === 'AWAITING_ACTION' && s.pendingPurchase) {
      s = apply(s, { type: 'DECLINE_PURCHASE', playerId: cur, at: AT });
      continue;
    }
    if (s.phase === 'AUCTION' && s.auction) {
      s = apply(s, { type: 'PASS_BID', playerId: s.auction.activeBidders[0], at: AT });
      continue;
    }
    break;
  }
  return s;
}

/** Tira los dados y deja el estado listo para el siguiente paso */
export function rollFull(state: GameState, d1: number, d2: number): GameState {
  return settle(rollAndResolve(state, d1, d2));
}
