import type { GameState } from '@collapolio/engine';

/**
 * Delta de estado. En vez de reenviar el snapshot completo en cada acción,
 * se envían sólo las claves raíz cambiadas y las entradas modificadas de
 * `players` / `board`, que son los arreglos grandes.
 */
export interface StatePatch {
  root: Partial<Record<string, unknown>>;
  players: [number, unknown][];
  board: [number, unknown][];
}

const BIG_ARRAYS = new Set(['players', 'board']);
/** El registro viaja como eventos `log_entry`, no dentro del delta */
const SKIP = new Set(['log', '_forcedDice']);

function eq(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function diffState(prev: GameState, next: GameState): StatePatch | null {
  const patch: StatePatch = { root: {}, players: [], board: [] };
  let changed = false;

  for (const key of Object.keys(next) as (keyof GameState)[]) {
    if (BIG_ARRAYS.has(key as string) || SKIP.has(key as string)) continue;
    if (!eq(prev[key], next[key])) {
      patch.root[key as string] = next[key];
      changed = true;
    }
  }

  for (let i = 0; i < next.players.length; i++) {
    if (!eq(prev.players[i], next.players[i])) {
      patch.players.push([i, next.players[i]]);
      changed = true;
    }
  }
  // Un jugador expulsado del lobby acorta el arreglo: en ese caso va completo
  if (prev.players.length !== next.players.length) {
    patch.root.players = next.players;
    patch.players = [];
    changed = true;
  }

  for (let i = 0; i < next.board.length; i++) {
    if (!eq(prev.board[i], next.board[i])) {
      patch.board.push([i, next.board[i]]);
      changed = true;
    }
  }

  return changed ? patch : null;
}
