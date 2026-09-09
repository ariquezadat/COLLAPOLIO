import { describe, expect, it } from 'vitest';
import { apply, money, newGame, setPosition, giveTiles, AT } from './helpers.js';
import { reduce } from '../src/reducer.js';
import { CHANCE_CARDS, CHEST_CARDS } from '../src/cards.js';

/** Fuerza la carta que saldrá del mazo */
function stackDeck(s: any, deck: 'chance' | 'chest', cardId: string) {
  const c = structuredClone(s);
  c.decks[deck] = [cardId, ...c.decks[deck].filter((x: string) => x !== cardId)];
  return c;
}

function drawFrom(s: any, tileIndex: number, deck: 'chance' | 'chest', cardId: string) {
  let st = setPosition(s, 'ana', tileIndex - 3);
  st = stackDeck(st, deck, cardId);
  st = { ...st, _forcedDice: [1, 2] as [number, number] };
  st = apply(st, { type: 'ROLL_DICE', playerId: 'ana', at: AT });
  st = apply(st, { type: 'RESOLVE_MOVE', at: AT });
  expect(st.pendingCard).not.toBeNull();
  return st;
}

describe('cartas', () => {
  it('los mazos tienen 16 cartas cada uno y sin ids repetidos', () => {
    expect(CHANCE_CARDS).toHaveLength(16);
    expect(CHEST_CARDS).toHaveLength(16);
    const ids = [...CHANCE_CARDS, ...CHEST_CARDS].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('la carta se aplica sólo al confirmarla', () => {
    let s = newGame(['ana', 'beto']);
    s = drawFrom(s, 7, 'chance', 'ch_dividendo'); // cobra 50
    expect(money(s, 'ana')).toBe(1500);
    s = apply(s, { type: 'ACK_CARD', playerId: 'ana', at: AT });
    expect(money(s, 'ana')).toBe(1550);
  });

  it('"avanza a la salida" cobra el sueldo', () => {
    let s = newGame(['ana', 'beto']);
    s = drawFrom(s, 36, 'chance', 'ch_salida');
    s = apply(s, { type: 'ACK_CARD', playerId: 'ana', at: AT });
    s = apply(s, { type: 'RESOLVE_MOVE', at: AT });
    expect(s.players.find((p: any) => p.id === 'ana')!.position).toBe(0);
    expect(money(s, 'ana')).toBe(1700);
  });

  it('la carta de cárcel encierra al jugador', () => {
    let s = newGame(['ana', 'beto']);
    s = drawFrom(s, 7, 'chance', 'ch_carcel');
    s = apply(s, { type: 'ACK_CARD', playerId: 'ana', at: AT });
    const ana = s.players.find((p: any) => p.id === 'ana')!;
    expect(ana.inJail).toBe(true);
    expect(ana.position).toBe(10);
  });

  it('"paga a cada jugador" reparte el monto', () => {
    let s = newGame(['ana', 'beto', 'caro']);
    s = drawFrom(s, 7, 'chance', 'ch_ronda'); // paga 50 a cada uno
    s = apply(s, { type: 'ACK_CARD', playerId: 'ana', at: AT });
    expect(money(s, 'ana')).toBe(1400);
    expect(money(s, 'beto')).toBe(1550);
    expect(money(s, 'caro')).toBe(1550);
  });

  it('"cobra a cada jugador" recauda de todos', () => {
    let s = newGame(['ana', 'beto', 'caro']);
    s = drawFrom(s, 17, 'chest', 'cc_reembolso'); // cobra 10 de cada uno
    s = apply(s, { type: 'ACK_CARD', playerId: 'ana', at: AT });
    expect(money(s, 'ana')).toBe(1520);
    expect(money(s, 'beto')).toBe(1490);
  });

  it('la carta de reparaciones cobra por casa y por hotel', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'ana', [6, 8, 9]);
    const withB = structuredClone(s);
    withB.board[6].houses = 2;
    withB.board[8].houses = 5; // hotel
    s = drawFrom(withB, 7, 'chance', 'ch_obras'); // 25 por casa, 100 por hotel
    s = apply(s, { type: 'ACK_CARD', playerId: 'ana', at: AT });
    expect(money(s, 'ana')).toBe(1500 - (2 * 25 + 100));
  });

  it('la carta guardada de indulto se acumula', () => {
    let s = newGame(['ana', 'beto']);
    s = drawFrom(s, 7, 'chance', 'ch_indulto');
    s = apply(s, { type: 'ACK_CARD', playerId: 'ana', at: AT });
    expect(s.players.find((p: any) => p.id === 'ana')!.getOutCards).toBe(1);
  });

  it('el mazo se reintegra cuando se agota', () => {
    let s = newGame(['ana', 'beto']);
    const c = structuredClone(s);
    c.decks.chance = [];
    c.discards.chance = ['ch_dividendo', 'ch_multa'];
    let st = setPosition(c, 'ana', 4);
    st = { ...st, _forcedDice: [1, 2] as [number, number] };
    st = apply(st, { type: 'ROLL_DICE', playerId: 'ana', at: AT });
    st = apply(st, { type: 'RESOLVE_MOVE', at: AT });
    expect(st.pendingCard).not.toBeNull();
    expect(st.decks.chance.length).toBe(1);
  });
});
