import type { Action, GameState, Player, Tile } from './types.js';
import { GROUP_SIZE } from './board.js';
import {
  canBuildHouse,
  countOwnedInGroup,
  currentPlayer,
  getPlayer,
  groupTiles,
  ownsFullSet,
} from './selectors.js';

/**
 * IA de bot: heurística simple y legible.
 *  - Compra si el efectivo supera 2x el precio, o si la casilla completa/avanza un set.
 *  - Construye en sets completos mientras conserve un colchón de efectivo.
 *  - Puja hasta un techo proporcional al valor estratégico de la casilla.
 *  - Acepta intercambios con ganancia neta positiva.
 */

const CASH_BUFFER = 150;

function tileValue(state: GameState, bot: Player, tile: Tile): number {
  const price = tile.price ?? 0;
  if (!tile.group) return price;
  const owned = countOwnedInGroup(state, bot.id, tile.group);
  const size = GROUP_SIZE[tile.group];
  // Completar el grupo vale mucho más que una casilla suelta
  if (owned + 1 === size) return price * 1.9;
  if (owned > 0) return price * 1.35;
  // Bloquear un grupo donde un rival ya tiene mayoría también tiene valor
  const rivalMax = Math.max(
    0,
    ...state.players
      .filter((p) => p.id !== bot.id && !p.bankrupt)
      .map((p) => countOwnedInGroup(state, p.id, tile.group!)),
  );
  if (rivalMax + 1 === size) return price * 1.25;
  return price;
}

function shouldBuy(state: GameState, bot: Player, tile: Tile): boolean {
  const price = tile.price ?? 0;
  if (bot.money < price) return false;
  const value = tileValue(state, bot, tile);
  if (value > price * 1.3) return bot.money >= price + 50;
  return bot.money > price * 2;
}

function nextBuild(state: GameState, bot: Player): number | null {
  const candidates = state.board
    .filter((t) => t.ownerId === bot.id && t.type === 'PROPERTY' && ownsFullSet(state, t))
    .filter((t) => canBuildHouse(state, bot.id, t.index) === null)
    // Prioriza el grupo con más recorrido y la casilla más barata del set
    .sort((a, b) => (a.houses ?? 0) - (b.houses ?? 0) || (a.houseCost ?? 0) - (b.houseCost ?? 0));
  for (const t of candidates) {
    if (bot.money - (t.houseCost ?? 0) >= CASH_BUFFER) return t.index;
  }
  return null;
}

function sideValue(state: GameState, side: { money: number; properties: number[]; getOutCards: number }, forPlayer: Player) {
  let v = side.money + side.getOutCards * 60;
  for (const idx of side.properties) {
    v += tileValue(state, forPlayer, state.board[idx]);
  }
  return v;
}

/** Decide la próxima acción del bot, o null si no le toca actuar. */
export function botDecide(state: GameState, botId: string, at: number): Action | null {
  const bot = getPlayer(state, botId);
  if (!bot || !bot.isBot || bot.bankrupt) return null;

  // 1) Responder intercambios dirigidos al bot (en cualquier fase)
  const pending = state.trades.find((t) => t.status === 'PENDING' && t.to.playerId === botId);
  if (pending) {
    const gain = sideValue(state, pending.from, bot) - sideValue(state, pending.to, bot);
    return { type: 'RESPOND_TRADE', playerId: botId, tradeId: pending.id, accept: gain > 0, at };
  }

  // 2) Subasta: puja hasta su techo
  if (state.phase === 'AUCTION' && state.auction?.activeBidders.includes(botId)) {
    const a = state.auction;
    const tile = state.board[a.tileIndex];
    const ceiling = Math.min(bot.money, Math.floor(tileValue(state, bot, tile) * 0.85));
    if (a.highestBidderId === botId) return null;
    // Sube a saltos proporcionales para que la subasta converja rápido
    const inc = state.settings.bidIncrement;
    const jump = Math.max(inc, Math.round((ceiling * 0.18) / inc) * inc);
    const next = Math.min(ceiling, a.highestBid + jump);
    if (next >= a.highestBid + inc && next <= ceiling) {
      return { type: 'BID', playerId: botId, amount: next, at };
    }
    return { type: 'PASS_BID', playerId: botId, at };
  }

  // 3) Deuda: liquidar activos o quebrar
  if (state.debt && state.debt.debtorId === botId) {
    const toSell = state.board
      .filter((t) => t.ownerId === botId && (t.houses ?? 0) > 0)
      .sort((x, y) => (y.houses ?? 0) - (x.houses ?? 0))[0];
    const groupHasHouses = (t: Tile) => groupTiles(state, t).some((g) => (g.houses ?? 0) > 0);
    const toMortgage = state.board
      .filter((t) => t.ownerId === botId && !t.mortgaged && (t.houses ?? 0) === 0 && !groupHasHouses(t))
      .sort((x, y) => (x.price ?? 0) - (y.price ?? 0))[0];
    if (toMortgage) return { type: 'MORTGAGE', playerId: botId, tileIndex: toMortgage.index, at };
    if (toSell) return { type: 'SELL_HOUSE', playerId: botId, tileIndex: toSell.index, at };
    return { type: 'DECLARE_BANKRUPTCY', playerId: botId, at };
  }

  // 4) Sólo en su turno
  if (currentPlayer(state)?.id !== botId) return null;

  switch (state.phase) {
    case 'ROLLING': {
      if (bot.inJail) {
        if (bot.getOutCards > 0) return { type: 'USE_JAIL_CARD', playerId: botId, at };
        // Sale pagando si tiene holgura y el tablero todavía da oportunidades
        if (bot.money > 400 && bot.jailTurns >= 1)
          return { type: 'PAY_BAIL', playerId: botId, at };
      }
      const build = nextBuild(state, bot);
      if (build !== null) return { type: 'BUILD_HOUSE', playerId: botId, tileIndex: build, at };
      return { type: 'ROLL_DICE', playerId: botId, at };
    }

    case 'RESOLVING_TILE':
      if (state.pendingCard) return { type: 'ACK_CARD', playerId: botId, at };
      return null;

    case 'AWAITING_ACTION': {
      if (state.pendingPurchase) {
        const tile = state.board[state.pendingPurchase.tileIndex];
        return shouldBuy(state, bot, tile)
          ? { type: 'BUY_PROPERTY', playerId: botId, at }
          : { type: 'DECLINE_PURCHASE', playerId: botId, at };
      }
      return null;
    }

    case 'TURN_END': {
      const build = nextBuild(state, bot);
      if (build !== null) return { type: 'BUILD_HOUSE', playerId: botId, tileIndex: build, at };
      // Deshipotecar cuando sobra efectivo
      const toFree = state.board.find(
        (t) =>
          t.ownerId === botId &&
          t.mortgaged &&
          bot.money - Math.ceil((t.mortgageValue ?? 0) * 1.1) > CASH_BUFFER * 3,
      );
      if (toFree) return { type: 'UNMORTGAGE', playerId: botId, tileIndex: toFree.index, at };
      return { type: 'END_TURN', playerId: botId, at };
    }

    default:
      return null;
  }
}

/** Retardo "humano" antes de ejecutar la acción del bot, en ms */
export function botDelay(action: Action): number {
  switch (action.type) {
    case 'ROLL_DICE':
      return 750;
    case 'BID':
    case 'PASS_BID':
      return 420;
    case 'BUILD_HOUSE':
    case 'UNMORTGAGE':
    case 'MORTGAGE':
    case 'SELL_HOUSE':
      return 500;
    case 'RESPOND_TRADE':
      return 1800;
    default:
      return 700;
  }
}
