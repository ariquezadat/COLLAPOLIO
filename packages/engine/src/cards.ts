/**
 * Mazos de Suerte y Arca Comunal. Textos originales (claves i18n `card.<id>`).
 * Se barajan al iniciar; los descartes se reintegran cuando el mazo se agota.
 */

export type CardEffect =
  | { kind: 'MOVE_TO'; index: number; collectGo: boolean }
  | { kind: 'MOVE_REL'; steps: number }
  | { kind: 'MOVE_NEAREST'; target: 'RAIL' | 'UTILITY'; forcedRent: boolean }
  | { kind: 'COLLECT'; amount: number }
  | { kind: 'PAY'; amount: number }
  | { kind: 'COLLECT_EACH'; amount: number }
  | { kind: 'PAY_EACH'; amount: number }
  | { kind: 'GOTO_JAIL' }
  | { kind: 'GET_OUT_CARD' }
  | { kind: 'REPAIRS'; perHouse: number; perHotel: number };

export interface Card {
  id: string;
  effect: CardEffect;
}

export const CHANCE_CARDS: Card[] = [
  { id: 'ch_salida', effect: { kind: 'MOVE_TO', index: 0, collectGo: true } },
  { id: 'ch_euphoria', effect: { kind: 'MOVE_TO', index: 39, collectGo: true } },
  { id: 'ch_upb', effect: { kind: 'MOVE_TO', index: 11, collectGo: true } },
  { id: 'ch_terminal_norte', effect: { kind: 'MOVE_TO', index: 15, collectGo: true } },
  { id: 'ch_sarcobamba', effect: { kind: 'MOVE_TO', index: 26, collectGo: true } },
  { id: 'ch_rail_cercano', effect: { kind: 'MOVE_NEAREST', target: 'RAIL', forcedRent: true } },
  { id: 'ch_servicio_cercano', effect: { kind: 'MOVE_NEAREST', target: 'UTILITY', forcedRent: true } },
  { id: 'ch_retroceder', effect: { kind: 'MOVE_REL', steps: -3 } },
  { id: 'ch_carcel', effect: { kind: 'GOTO_JAIL' } },
  { id: 'ch_indulto', effect: { kind: 'GET_OUT_CARD' } },
  { id: 'ch_dividendo', effect: { kind: 'COLLECT', amount: 50 } },
  { id: 'ch_prestamo', effect: { kind: 'COLLECT', amount: 150 } },
  { id: 'ch_multa', effect: { kind: 'PAY', amount: 15 } },
  { id: 'ch_obras', effect: { kind: 'REPAIRS', perHouse: 25, perHotel: 100 } },
  { id: 'ch_ronda', effect: { kind: 'PAY_EACH', amount: 50 } },
  { id: 'ch_premio', effect: { kind: 'COLLECT', amount: 100 } },
];

export const CHEST_CARDS: Card[] = [
  { id: 'cc_salida', effect: { kind: 'MOVE_TO', index: 0, collectGo: true } },
  { id: 'cc_herencia', effect: { kind: 'COLLECT', amount: 100 } },
  { id: 'cc_devolucion', effect: { kind: 'COLLECT', amount: 20 } },
  { id: 'cc_venta', effect: { kind: 'COLLECT', amount: 50 } },
  { id: 'cc_seguro', effect: { kind: 'COLLECT', amount: 25 } },
  { id: 'cc_reembolso', effect: { kind: 'COLLECT_EACH', amount: 10 } },
  { id: 'cc_deposito', effect: { kind: 'COLLECT', amount: 200 } },
  { id: 'cc_bono', effect: { kind: 'COLLECT', amount: 45 } },
  { id: 'cc_hospital', effect: { kind: 'PAY', amount: 100 } },
  { id: 'cc_matricula', effect: { kind: 'PAY', amount: 50 } },
  { id: 'cc_contribucion', effect: { kind: 'PAY', amount: 40 } },
  { id: 'cc_carcel', effect: { kind: 'GOTO_JAIL' } },
  { id: 'cc_indulto', effect: { kind: 'GET_OUT_CARD' } },
  { id: 'cc_inspeccion', effect: { kind: 'REPAIRS', perHouse: 40, perHotel: 115 } },
  { id: 'cc_concurso', effect: { kind: 'COLLECT', amount: 10 } },
  { id: 'cc_impuesto', effect: { kind: 'PAY', amount: 75 } },
];

const BY_ID = new Map<string, Card>();
for (const c of [...CHANCE_CARDS, ...CHEST_CARDS]) BY_ID.set(c.id, c);

export function getCard(id: string): Card {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`Carta desconocida: ${id}`);
  return c;
}
