import type { Tile, GroupId } from './types.js';

/**
 * Tablero de CollaPolio — 40 casillas con nomenclatura de Cochabamba:
 * de las pollerías del barrio a los boliches y las zonas altas.
 * Los nombres son claves i18n: `tile.<key>`.
 */

export const GROUP_COLORS: Record<GroupId, string> = {
  adobe: '#8c6249',
  cielo: '#4fc3e8',
  coral: '#f0508c',
  ambar: '#f59331',
  granate: '#e2354c',
  oro: '#f2c53d',
  jade: '#2fbf71',
  indigo: '#5b6cf9',
  rail: '#9aa4b8',
  utility: '#7de0d0',
};

/** Cuántas casillas tiene cada grupo (para detectar set completo) */
export const GROUP_SIZE: Record<GroupId, number> = {
  adobe: 2,
  cielo: 3,
  coral: 3,
  ambar: 3,
  granate: 3,
  oro: 3,
  jade: 3,
  indigo: 2,
  rail: 4,
  utility: 2,
};

interface PropSpec {
  i: number;
  key: string;
  g: GroupId;
  price: number;
  rents: number[];
  house: number;
}

const PROPS: PropSpec[] = [
  { i: 1, key: 'pollos_pampeno', g: 'adobe', price: 60, rents: [2, 10, 30, 90, 160, 250], house: 50 },
  { i: 3, key: 'lolo_chicken', g: 'adobe', price: 60, rents: [4, 20, 60, 180, 320, 450], house: 50 },
  { i: 6, key: 'el_mirador', g: 'cielo', price: 100, rents: [6, 30, 90, 270, 400, 550], house: 50 },
  { i: 8, key: 'la_pepsi_de_sacaba', g: 'cielo', price: 100, rents: [6, 30, 90, 270, 400, 550], house: 50 },
  { i: 9, key: 'la_casona', g: 'cielo', price: 120, rents: [8, 40, 100, 300, 450, 600], house: 50 },
  { i: 11, key: 'upb', g: 'coral', price: 140, rents: [10, 50, 150, 450, 625, 750], house: 100 },
  { i: 13, key: 'univalle', g: 'coral', price: 140, rents: [10, 50, 150, 450, 625, 750], house: 100 },
  { i: 14, key: 'ucb', g: 'coral', price: 160, rents: [12, 60, 180, 500, 700, 900], house: 100 },
  { i: 16, key: 'burger_king', g: 'ambar', price: 180, rents: [14, 70, 200, 550, 750, 950], house: 100 },
  { i: 18, key: 'estadio_felix_capriles', g: 'ambar', price: 180, rents: [14, 70, 200, 550, 750, 950], house: 100 },
  { i: 19, key: 'kebab_villarroel', g: 'ambar', price: 200, rents: [16, 80, 220, 600, 800, 1000], house: 100 },
  { i: 21, key: 'tiquipaya', g: 'granate', price: 220, rents: [18, 90, 250, 700, 875, 1050], house: 150 },
  { i: 23, key: 'pretty_woman', g: 'granate', price: 220, rents: [18, 90, 250, 700, 875, 1050], house: 150 },
  { i: 24, key: 'country_club', g: 'granate', price: 240, rents: [20, 100, 300, 750, 925, 1100], house: 150 },
  { i: 26, key: 'sarcobamba', g: 'oro', price: 260, rents: [22, 110, 330, 800, 975, 1150], house: 150 },
  { i: 27, key: 'fidel_anze', g: 'oro', price: 260, rents: [22, 110, 330, 800, 975, 1150], house: 150 },
  { i: 29, key: 'parque_lincoln', g: 'oro', price: 280, rents: [24, 120, 360, 850, 1025, 1200], house: 150 },
  { i: 31, key: 'bosque_norte', g: 'jade', price: 300, rents: [26, 130, 390, 900, 1100, 1275], house: 200 },
  { i: 32, key: 'bosque_sur', g: 'jade', price: 300, rents: [26, 130, 390, 900, 1100, 1275], house: 200 },
  { i: 34, key: 'lomas_de_aranjuez', g: 'jade', price: 320, rents: [28, 150, 450, 1000, 1200, 1400], house: 200 },
  { i: 37, key: 'aeme', g: 'indigo', price: 350, rents: [35, 175, 500, 1100, 1300, 1500], house: 200 },
  { i: 39, key: 'euphoria', g: 'indigo', price: 400, rents: [50, 200, 600, 1400, 1700, 2000], house: 200 },
];

const RAILS: { i: number; key: string }[] = [
  { i: 5, key: 'terminal_poniente' },
  { i: 15, key: 'terminal_norte' },
  { i: 25, key: 'terminal_oriente' },
  { i: 35, key: 'terminal_sur' },
];

const UTILS: { i: number; key: string }[] = [
  { i: 12, key: 'central_electrica' },
  { i: 28, key: 'planta_de_agua' },
];

/** Renta de ferrocarriles según cuántos posee el dueño */
export const RAIL_RENT = [0, 25, 50, 100, 200];
/** Multiplicadores de servicios sobre la suma de dados */
export const UTILITY_MULT = [0, 4, 10];

export const JAIL_INDEX = 10;
export const GO_TO_JAIL_INDEX = 30;
export const GO_INDEX = 0;
export const FREE_PARKING_INDEX = 20;
export const BOARD_SIZE = 40;

export function createBoard(): Tile[] {
  const board: Tile[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    board.push({ index: i, type: 'PROPERTY', name: '', ownerId: null, houses: 0, mortgaged: false });
  }

  const specials: Record<number, { type: Tile['type']; key: string; amount?: number }> = {
    0: { type: 'GO', key: 'salida' },
    2: { type: 'CHEST', key: 'arca' },
    4: { type: 'TAX', key: 'impuesto_renta', amount: 200 },
    7: { type: 'CHANCE', key: 'suerte' },
    10: { type: 'JAIL', key: 'carcel' },
    17: { type: 'CHEST', key: 'arca' },
    20: { type: 'FREE_PARKING', key: 'descanso' },
    22: { type: 'CHANCE', key: 'suerte' },
    30: { type: 'GOTO_JAIL', key: 'a_la_carcel' },
    33: { type: 'CHEST', key: 'arca' },
    36: { type: 'CHANCE', key: 'suerte' },
    38: { type: 'TAX', key: 'impuesto_lujo', amount: 100 },
  };

  for (const [idx, s] of Object.entries(specials)) {
    const t = board[Number(idx)];
    t.type = s.type;
    t.name = s.key;
    if (s.amount !== undefined) t.amount = s.amount;
  }

  for (const p of PROPS) {
    const t = board[p.i];
    t.type = 'PROPERTY';
    t.name = p.key;
    t.group = p.g;
    t.price = p.price;
    t.rentTable = p.rents;
    t.houseCost = p.house;
    t.mortgageValue = Math.floor(p.price / 2);
  }

  for (const r of RAILS) {
    const t = board[r.i];
    t.type = 'RAIL';
    t.name = r.key;
    t.group = 'rail';
    t.price = 200;
    t.mortgageValue = 100;
  }

  for (const u of UTILS) {
    const t = board[u.i];
    t.type = 'UTILITY';
    t.name = u.key;
    t.group = 'utility';
    t.price = 150;
    t.mortgageValue = 75;
  }

  return board;
}

export const DEFAULT_SETTINGS = {
  startingCash: 1500,
  maxPlayers: 6,
  turnTimer: 90,
  allowAuctions: true,
  vacationCash: false,
  doubleRentOnFullSet: true,
  mortgageEnabled: true,
  evenBuild: true,
  x2RentOnFullSet: true,
  randomizeOrder: true,
  botCount: 0,
  bidIncrement: 10,
  auctionTimer: 10,
  goSalary: 200,
  bailAmount: 50,
};

/** Paleta de acentos para las fichas de jugador */
export const PLAYER_COLORS = [
  '#ff5c7a',
  '#3dd6a0',
  '#5b8cff',
  '#ffb03d',
  '#c07cff',
  '#28d3e8',
  '#ff8a3d',
  '#8de84a',
];
