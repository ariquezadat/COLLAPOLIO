import { describe, expect, it } from 'vitest';
import { apply, expectFail, giveTiles, money, newGame, setMoney, tile } from './helpers.js';

const AT = 1;

describe('construcción', () => {
  it('exige el set completo para construir', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'ana', [6, 8]); // falta la 9
    expect(expectFail(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 6, at: AT })).toBe(
      'no_full_set',
    );
    s = giveTiles(s, 'ana', [9]);
    s = apply(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 6, at: AT });
    expect(tile(s, 6).houses).toBe(1);
  });

  it('obliga a construcción pareja (máx. 1 casa de diferencia)', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'ana', [6, 8, 9]);
    s = apply(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 6, at: AT });
    expect(expectFail(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 6, at: AT })).toBe(
      'uneven',
    );
    s = apply(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 8, at: AT });
    s = apply(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 9, at: AT });
    s = apply(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 6, at: AT });
    expect(tile(s, 6).houses).toBe(2);
  });

  it('permite construcción despareja si evenBuild está apagado', () => {
    let s = newGame(['ana', 'beto'], { evenBuild: false });
    s = giveTiles(s, 'ana', [6, 8, 9]);
    s = apply(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 6, at: AT });
    s = apply(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 6, at: AT });
    expect(tile(s, 6).houses).toBe(2);
  });

  it('llega a hotel en el quinto nivel y no más', () => {
    let s = newGame(['ana', 'beto'], { evenBuild: false });
    s = giveTiles(s, 'ana', [37, 39]);
    s = setMoney(s, 'ana', 5000);
    for (let i = 0; i < 5; i++) {
      s = apply(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 37, at: AT });
    }
    expect(tile(s, 37).houses).toBe(5);
    expect(expectFail(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 37, at: AT })).toBe(
      'max_level',
    );
  });

  it('cobra el costo de casa y devuelve la mitad al vender', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'ana', [6, 8, 9]);
    const before = money(s, 'ana');
    s = apply(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 6, at: AT });
    expect(money(s, 'ana')).toBe(before - 50);
    s = apply(s, { type: 'SELL_HOUSE', playerId: 'ana', tileIndex: 6, at: AT });
    expect(money(s, 'ana')).toBe(before - 25);
  });

  it('no deja construir sobre un grupo con alguna hipoteca', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'ana', [6, 8, 9]);
    s = apply(s, { type: 'MORTGAGE', playerId: 'ana', tileIndex: 9, at: AT });
    expect(expectFail(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 6, at: AT })).toBe(
      'group_mortgaged',
    );
  });
});

describe('hipotecas', () => {
  it('paga el 50% al hipotecar y cobra 10% extra al levantarla', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'ana', [39]); // $400 → hipoteca 200, levantar 220
    const before = money(s, 'ana');
    s = apply(s, { type: 'MORTGAGE', playerId: 'ana', tileIndex: 39, at: AT });
    expect(money(s, 'ana')).toBe(before + 200);
    expect(tile(s, 39).mortgaged).toBe(true);
    s = apply(s, { type: 'UNMORTGAGE', playerId: 'ana', tileIndex: 39, at: AT });
    expect(money(s, 'ana')).toBe(before - 20);
    expect(tile(s, 39).mortgaged).toBe(false);
  });

  it('no permite hipotecar con casas encima', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'ana', [6, 8, 9]);
    s = apply(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 6, at: AT });
    expect(expectFail(s, { type: 'MORTGAGE', playerId: 'ana', tileIndex: 6, at: AT })).toBe(
      'has_houses',
    );
  });
});
