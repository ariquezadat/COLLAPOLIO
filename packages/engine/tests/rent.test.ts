import { describe, expect, it } from 'vitest';
import { apply, giveTiles, money, newGame, rollAndResolve, setMoney, setPosition, tile } from './helpers.js';
import { calcRent } from '../src/selectors.js';

describe('rentas', () => {
  it('cobra la renta base al caer en propiedad ajena', () => {
    // 6 = Av. Los Álamos (cielo, $100, base 6)
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'beto', [6]);
    s = setPosition(s, 'ana', 0);
    const before = money(s, 'ana');
    s = rollAndResolve(s, 2, 4); // 0 → 6
    expect(money(s, 'ana')).toBe(before - 6);
    expect(money(s, 'beto')).toBe(1500 + 6);
  });

  it('duplica la renta con el set completo sin construir', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'beto', [6, 8, 9]); // grupo cielo completo
    s = setPosition(s, 'ana', 0);
    s = rollAndResolve(s, 2, 4);
    expect(money(s, 'ana')).toBe(1500 - 12); // 6 x2
  });

  it('no duplica si doubleRentOnFullSet está apagado', () => {
    let s = newGame(['ana', 'beto'], { doubleRentOnFullSet: false, x2RentOnFullSet: false });
    s = giveTiles(s, 'beto', [6, 8, 9]);
    s = setPosition(s, 'ana', 0);
    s = rollAndResolve(s, 2, 4);
    expect(money(s, 'ana')).toBe(1500 - 6);
  });

  it('usa la tabla de construcción cuando hay casas', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'beto', [6, 8, 9]);
    const withHouses = structuredClone(s);
    withHouses.board[6].houses = 3; // renta 270
    const t = withHouses.board[6];
    expect(calcRent(withHouses, t, 6)).toBe(270);
    withHouses.board[6].houses = 5; // hotel → 550
    expect(calcRent(withHouses, withHouses.board[6], 6)).toBe(550);
  });

  it('no cobra renta si la propiedad está hipotecada', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'beto', [6]);
    s = apply(s, { type: 'MORTGAGE', playerId: 'beto', tileIndex: 6, at: 1 });
    s = setPosition(s, 'ana', 0);
    s = rollAndResolve(s, 2, 4);
    expect(money(s, 'ana')).toBe(1500);
  });

  it('no cobra renta al propio dueño', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'ana', [6]);
    s = setPosition(s, 'ana', 0);
    s = rollAndResolve(s, 2, 4);
    expect(money(s, 'ana')).toBe(1500);
  });

  it('escala la renta de ferrocarriles 25/50/100/200', () => {
    let s = newGame(['ana', 'beto']);
    const rails = [5, 15, 25, 35];
    const expected = [25, 50, 100, 200];
    for (let n = 1; n <= 4; n++) {
      const g = giveTiles(s, 'beto', rails.slice(0, n));
      expect(calcRent(g, g.board[5], 7)).toBe(expected[n - 1]);
    }
  });

  it('cobra dados x4 con un servicio y x10 con ambos', () => {
    let s = newGame(['ana', 'beto']);
    let g = giveTiles(s, 'beto', [12]);
    expect(calcRent(g, g.board[12], 9)).toBe(36);
    g = giveTiles(g, 'beto', [28]);
    expect(calcRent(g, g.board[12], 9)).toBe(90);
  });

  it('el servicio cobra según los dados realmente tirados', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'beto', [12]);
    s = setPosition(s, 'ana', 6);
    s = rollAndResolve(s, 3, 3); // 6 → 12, suma 6 → 24
    expect(money(s, 'ana')).toBe(1500 - 24);
  });
});
