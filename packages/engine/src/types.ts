/**
 * CollaPolio — modelo de dominio.
 * El servidor es la única fuente de verdad: estos tipos describen el estado
 * canónico que vive en el servidor y se replica al cliente para renderizar.
 */

export type TileType =
  | 'PROPERTY'
  | 'RAIL'
  | 'UTILITY'
  | 'TAX'
  | 'CHANCE'
  | 'CHEST'
  | 'GO'
  | 'JAIL'
  | 'GOTO_JAIL'
  | 'FREE_PARKING';

export type GroupId =
  | 'adobe'
  | 'cielo'
  | 'coral'
  | 'ambar'
  | 'granate'
  | 'oro'
  | 'jade'
  | 'indigo'
  | 'rail'
  | 'utility';

export type Phase =
  | 'LOBBY'
  | 'ROLLING'
  | 'MOVING'
  | 'RESOLVING_TILE'
  | 'AWAITING_ACTION'
  | 'AUCTION'
  | 'TRADING'
  | 'TURN_END'
  | 'GAME_OVER';

export interface Tile {
  index: number;
  type: TileType;
  /** Clave i18n del nombre. El texto visible se resuelve en el cliente. */
  name: string;
  group?: GroupId;
  price?: number;
  /** [base, 1 casa, 2, 3, 4, hotel] — sólo PROPERTY */
  rentTable?: number[];
  houseCost?: number;
  mortgageValue?: number;
  /** Monto fijo — sólo TAX */
  amount?: number;
  ownerId?: string | null;
  houses?: number; // 0..5 (5 = hotel)
  mortgaged?: boolean;
}

export interface Player {
  id: string;
  nick: string;
  avatar: string;
  color: string;
  money: number;
  position: number;
  /** Índices de casillas poseídas */
  properties: number[];
  jailTurns: number; // 0 = libre, 1..3 = intentos consumidos dentro de la cárcel
  inJail: boolean;
  getOutCards: number;
  bankrupt: boolean;
  isBot: boolean;
  connected: boolean;
  /** Timestamp de desconexión, para el auto-play a los 60s */
  disconnectedAt?: number | null;
  netWorth?: number;
}

export interface GameSettings {
  startingCash: number;
  maxPlayers: number;
  /** Segundos por turno. 0 = sin límite. */
  turnTimer: number;
  allowAuctions: boolean;
  /** El bote de "Descanso" acumula impuestos y multas */
  vacationCash: boolean;
  doubleRentOnFullSet: boolean;
  mortgageEnabled: boolean;
  evenBuild: boolean;
  x2RentOnFullSet: boolean;
  randomizeOrder: boolean;
  botCount: number;
  /** Incremento mínimo de puja en subasta */
  bidIncrement: number;
  /** Segundos que dura la subasta; se reinicia con cada puja */
  auctionTimer: number;
  /** Sueldo al pasar por Salida */
  goSalary: number;
  /** Fianza para salir de la cárcel */
  bailAmount: number;
}

export interface AuctionState {
  tileIndex: number;
  highestBid: number;
  highestBidderId: string | null;
  /** Jugadores que siguen pujando */
  activeBidders: string[];
  deadline: number;
  history: { playerId: string; amount: number }[];
}

export interface TradeSide {
  playerId: string;
  money: number;
  properties: number[];
  getOutCards: number;
}

export interface Trade {
  id: string;
  from: TradeSide;
  to: TradeSide;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: number;
  /** id del trade al que contraoferta */
  counterOf?: string | null;
}

export interface PendingCard {
  deck: 'CHANCE' | 'CHEST';
  cardId: string;
}

export interface Debt {
  debtorId: string;
  /** null = se le debe al banco */
  creditorId: string | null;
  amount: number;
  reason: 'RENT' | 'TAX' | 'CARD' | 'BAIL' | 'BUILD';
  /** Si la deuda se reparte entre varios (p. ej. "paga $50 a cada jugador") */
  distributeTo?: string[] | null;
}

export interface LogEntry {
  id: number;
  at: number;
  /** Clave i18n */
  key: string;
  params?: Record<string, string | number>;
  playerId?: string;
}

export interface MoveAnimation {
  playerId: string;
  from: number;
  to: number;
  /** Casillas intermedias recorridas, incluye destino */
  path: number[];
  /** true si el salto es directo (carta), sin recorrer casillas */
  teleport: boolean;
}

export interface GameState {
  phase: Phase;
  players: Player[];
  /** Orden de turno por id */
  order: string[];
  turnIndex: number;
  board: Tile[];
  dice: [number, number] | null;
  doublesCount: number;
  /** Compra pendiente de decisión */
  pendingPurchase: { tileIndex: number } | null;
  pendingCard: PendingCard | null;
  debt: Debt | null;
  auction: AuctionState | null;
  trades: Trade[];
  decks: { chance: string[]; chest: string[] };
  discards: { chance: string[]; chest: string[] };
  log: LogEntry[];
  settings: GameSettings;
  winnerId: string | null;
  hostId: string;
  freeParkingPot: number;
  lastMove: MoveAnimation | null;
  /** Multiplicador especial de renta forzado por carta (ferrocarril x2, servicio x10) */
  forcedRent: { kind: 'RAIL_X2' | 'UTILITY_X10' } | null;
  /** Deadline del jugador en turno (ms epoch). null = sin límite */
  turnDeadline: number | null;
  /** Momento en que la animación de movimiento termina y se resuelve la casilla */
  resolveAt: number | null;
  /** Estado del PRNG (mulberry32) */
  rng: number;
  logSeq: number;
  startedAt: number | null;
  /** Sólo para tests: fuerza el próximo par de dados */
  _forcedDice?: [number, number] | null;
}

/* ─────────────────────────── Acciones del reducer ─────────────────────────── */

export type Action =
  // Lobby
  | { type: 'JOIN'; playerId: string; nick: string; avatar: string; isBot?: boolean }
  | { type: 'LEAVE'; playerId: string }
  | { type: 'KICK_PLAYER'; playerId: string; targetId: string }
  | { type: 'ADD_BOT'; playerId: string }
  | { type: 'SET_SETTINGS'; playerId: string; settings: Partial<GameSettings> }
  | { type: 'SET_CONNECTED'; playerId: string; connected: boolean; at: number }
  | { type: 'START_GAME'; playerId: string; at: number }
  // Turno
  | { type: 'ROLL_DICE'; playerId: string; at: number }
  | { type: 'RESOLVE_MOVE'; at: number }
  | { type: 'ACK_CARD'; playerId: string; at: number }
  | { type: 'BUY_PROPERTY'; playerId: string; at: number }
  | { type: 'DECLINE_PURCHASE'; playerId: string; at: number }
  | { type: 'END_TURN'; playerId: string; at: number }
  // Cárcel
  | { type: 'PAY_BAIL'; playerId: string; at: number }
  | { type: 'USE_JAIL_CARD'; playerId: string; at: number }
  // Gestión
  | { type: 'BUILD_HOUSE'; playerId: string; tileIndex: number; at: number }
  | { type: 'SELL_HOUSE'; playerId: string; tileIndex: number; at: number }
  | { type: 'MORTGAGE'; playerId: string; tileIndex: number; at: number }
  | { type: 'UNMORTGAGE'; playerId: string; tileIndex: number; at: number }
  // Subasta
  | { type: 'BID'; playerId: string; amount: number; at: number }
  | { type: 'PASS_BID'; playerId: string; at: number }
  // Trading
  | {
      type: 'PROPOSE_TRADE';
      playerId: string;
      tradeId: string;
      to: string;
      offer: { money: number; properties: number[]; getOutCards: number };
      request: { money: number; properties: number[]; getOutCards: number };
      counterOf?: string | null;
      at: number;
    }
  | { type: 'RESPOND_TRADE'; playerId: string; tradeId: string; accept: boolean; at: number }
  | { type: 'CANCEL_TRADE'; playerId: string; tradeId: string; at: number }
  // Quiebra y reloj
  | { type: 'DECLARE_BANKRUPTCY'; playerId: string; at: number }
  | { type: 'TICK'; at: number };

export interface ReduceResult {
  state: GameState;
  /** Eventos derivados para emitir por socket (animaciones, sonidos) */
  events: GameEvent[];
  /** Motivo del rechazo, si la acción fue inválida */
  error?: string;
}

export type GameEvent =
  | { type: 'dice_rolled'; d1: number; d2: number; playerId: string }
  | { type: 'player_moved'; playerId: string; path: number[]; teleport: boolean }
  | { type: 'tile_resolved'; playerId: string; tileIndex: number }
  | { type: 'auction_started'; tileIndex: number }
  | { type: 'auction_bid'; playerId: string; amount: number }
  | { type: 'auction_won'; playerId: string | null; tileIndex: number; amount: number }
  | { type: 'trade_proposed'; tradeId: string }
  | { type: 'trade_resolved'; tradeId: string; accepted: boolean }
  | { type: 'player_bankrupt'; playerId: string; creditorId: string | null }
  | { type: 'game_over'; winnerId: string | null }
  | { type: 'card_drawn'; deck: 'CHANCE' | 'CHEST'; cardId: string; playerId: string }
  | { type: 'money_changed'; playerId: string; delta: number; reason: string }
  | { type: 'log_entry'; entry: LogEntry };
