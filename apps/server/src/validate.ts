import { config } from './config.js';

const ANGLE_BRACKETS = new Set([0x3c, 0x3e]); // < >

/** Elimina caracteres de control (y opcionalmente los angulares de HTML) */
function sanitize(input: string, opts: { replacement?: string; dropAngles?: boolean } = {}): string {
  const replacement = opts.replacement ?? '';
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 || code === 0x7f) {
      out += replacement;
      continue;
    }
    if (opts.dropAngles && ANGLE_BRACKETS.has(code)) continue;
    out += ch;
  }
  return out;
}

export function isString(v: unknown, max = 200): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}

export function isTileIndex(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 40;
}

export function isAmount(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1_000_000;
}

export function isIndexList(v: unknown): v is number[] {
  return Array.isArray(v) && v.length <= 28 && v.every(isTileIndex);
}

export interface TradeSideInput {
  money: number;
  properties: number[];
  getOutCards: number;
}

export function parseTradeSide(v: unknown): TradeSideInput | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (!isAmount(o.money) || !isIndexList(o.properties)) return null;
  if (typeof o.getOutCards !== 'number' || o.getOutCards < 0 || o.getOutCards > 10) return null;
  return {
    money: Math.floor(o.money),
    properties: [...new Set(o.properties)],
    getOutCards: Math.floor(o.getOutCards),
  };
}

export function cleanNick(v: unknown): string {
  const raw = typeof v === 'string' ? v.trim() : '';
  const safe = sanitize(raw, { dropAngles: true }).slice(0, config.maxNickLength).trim();
  return safe || 'Jugador';
}

export function cleanText(v: unknown, max = config.maxChatLength): string | null {
  if (typeof v !== 'string') return null;
  const s = sanitize(v, { replacement: ' ' }).trim().slice(0, max);
  return s || null;
}

const SETTING_KEYS = [
  'startingCash',
  'maxPlayers',
  'turnTimer',
  'allowAuctions',
  'vacationCash',
  'doubleRentOnFullSet',
  'mortgageEnabled',
  'evenBuild',
  'x2RentOnFullSet',
  'randomizeOrder',
  'bidIncrement',
  'auctionTimer',
  'goSalary',
  'bailAmount',
] as const;

/** Filtra el objeto de settings a claves conocidas y tipos correctos */
export function parseSettings(v: unknown): Record<string, number | boolean> {
  const out: Record<string, number | boolean> = {};
  if (typeof v !== 'object' || v === null) return out;
  const o = v as Record<string, unknown>;
  for (const key of SETTING_KEYS) {
    const val = o[key];
    if (typeof val === 'boolean') out[key] = val;
    else if (typeof val === 'number' && Number.isFinite(val)) out[key] = Math.floor(val);
  }
  return out;
}
