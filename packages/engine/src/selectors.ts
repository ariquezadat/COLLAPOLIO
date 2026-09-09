import type { GameState, Player, Tile } from './types.js';
import { GROUP_SIZE, RAIL_RENT, UTILITY_MULT } from './board.js';

export function getPlayer(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

export function currentPlayer(state: GameState): Player | undefined {
  const id = state.order[state.turnIndex];
  return id ? getPlayer(state, id) : undefined;
}

export function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.bankrupt);
}

/** Casillas del mismo grupo que `tile` */
export function groupTiles(state: GameState, tile: Tile): Tile[] {
  if (!tile.group) return [];
  return state.board.filter((t) => t.group === tile.group);
}

/** ¿El dueño de `tile` posee el grupo completo? */
export function ownsFullSet(state: GameState, tile: Tile): boolean {
  if (!tile.group || !tile.ownerId) return false;
  const tiles = groupTiles(state, tile);
  if (tiles.length !== GROUP_SIZE[tile.group]) return false;
  return tiles.every((t) => t.ownerId === tile.ownerId);
}

export function countOwnedInGroup(state: GameState, ownerId: string, group: string): number {
  return state.board.filter((t) => t.group === group && t.ownerId === ownerId).length;
}

/**
 * Renta a pagar por caer en `tile`.
 * `diceSum` sólo se usa para servicios. `forced` proviene de cartas
 * ("avanza al ferrocarril más cercano y paga el doble").
 */
export function calcRent(
  state: GameState,
  tile: Tile,
  diceSum: number,
  forced?: 'RAIL_X2' | 'UTILITY_X10' | null,
): number {
  if (!tile.ownerId || tile.mortgaged) return 0;

  if (tile.type === 'PROPERTY') {
    const houses = tile.houses ?? 0;
    const table = tile.rentTable!;
    if (houses > 0) return table[houses];
    const doubleOnSet = state.settings.doubleRentOnFullSet || state.settings.x2RentOnFullSet;
    return ownsFullSet(state, tile) && doubleOnSet ? table[0] * 2 : table[0];
  }

  if (tile.type === 'RAIL') {
    const owned = countOwnedInGroup(state, tile.ownerId, 'rail');
    const base = RAIL_RENT[Math.min(owned, 4)];
    return forced === 'RAIL_X2' ? base * 2 : base;
  }

  if (tile.type === 'UTILITY') {
    if (forced === 'UTILITY_X10') return diceSum * 10;
    const owned = countOwnedInGroup(state, tile.ownerId, 'utility');
    return diceSum * UTILITY_MULT[Math.min(owned, 2)];
  }

  return 0;
}

/** Patrimonio neto: efectivo + valor de venta de todo lo que posee */
export function netWorth(state: GameState, player: Player): number {
  let total = player.money;
  for (const idx of player.properties) {
    const t = state.board[idx];
    if (t.mortgaged) {
      // Una propiedad hipotecada sigue valiendo su precio menos la deuda
      total += (t.price ?? 0) - (t.mortgageValue ?? 0);
    } else {
      total += t.price ?? 0;
    }
    total += (t.houses ?? 0) * (t.houseCost ?? 0);
  }
  return total;
}

/** Dinero máximo que el jugador puede reunir liquidando todo */
export function liquidationValue(state: GameState, player: Player): number {
  let total = player.money;
  for (const idx of player.properties) {
    const t = state.board[idx];
    total += Math.floor(((t.houses ?? 0) * (t.houseCost ?? 0)) / 2);
    if (!t.mortgaged) total += t.mortgageValue ?? 0;
  }
  return total;
}

/** ¿Puede construir una casa en `tile` respetando construcción pareja? */
export function canBuildHouse(state: GameState, playerId: string, tileIndex: number): string | null {
  const tile = state.board[tileIndex];
  if (!tile || tile.type !== 'PROPERTY') return 'not_property';
  if (tile.ownerId !== playerId) return 'not_owner';
  if (!ownsFullSet(state, tile)) return 'no_full_set';
  if (tile.mortgaged) return 'mortgaged';
  const group = groupTiles(state, tile);
  if (group.some((t) => t.mortgaged)) return 'group_mortgaged';
  if ((tile.houses ?? 0) >= 5) return 'max_level';
  if (state.settings.evenBuild) {
    const min = Math.min(...group.map((t) => t.houses ?? 0));
    if ((tile.houses ?? 0) > min) return 'uneven';
  }
  const player = getPlayer(state, playerId);
  if (!player || player.money < (tile.houseCost ?? 0)) return 'no_money';
  return null;
}

export function canSellHouse(state: GameState, playerId: string, tileIndex: number): string | null {
  const tile = state.board[tileIndex];
  if (!tile || tile.type !== 'PROPERTY') return 'not_property';
  if (tile.ownerId !== playerId) return 'not_owner';
  if ((tile.houses ?? 0) <= 0) return 'no_houses';
  if (state.settings.evenBuild) {
    const group = groupTiles(state, tile);
    const max = Math.max(...group.map((t) => t.houses ?? 0));
    if ((tile.houses ?? 0) < max) return 'uneven';
  }
  return null;
}

/** Propiedades que el jugador puede hipotecar ahora mismo */
export function mortgageableTiles(state: GameState, playerId: string): number[] {
  return state.board
    .filter((t) => t.ownerId === playerId && !t.mortgaged && (t.houses ?? 0) === 0)
    .map((t) => t.index);
}
