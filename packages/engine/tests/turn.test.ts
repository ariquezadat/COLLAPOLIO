import { describe, expect, it } from 'vitest';
import { apply, expectFail, money, newGame, rollAndResolve, rollFull, settle, setPosition, AT } from './helpers.js';
import { reduce } from '../src/reducer.js';

describe('flujo de turno', () => {
  it('mueve la ficha la suma de los dados', () => {
    let s = newGame(['ana', 'beto']);
    s = rollAndResolve(s, 3, 5);
    expect(s.players.find((p) => p.id === 'ana')!.position).toBe(8);
  });

  it('cobra $200 al pasar por la salida', () => {
    let s = newGame(['ana', 'beto']);
    s = setPosition(s, 'ana', 38);
    s = rollAndResolve(s, 2, 3); // 38 → 3, pasando por la salida
    expect(money(s, 'ana')).toBe(1500 + 200);
    expect(s.players.find((p) => p.id === 'ana')!.position).toBe(3);
  });

  it('con dobles concede una tirada extra', () => {
    let s = newGame(['ana', 'beto']);
    s = rollAndResolve(s, 2, 2);
    // 4 = impuesto, se paga y vuelve a ROLLING por los dobles
    expect(s.phase).toBe('ROLLING');
    expect(s.order[s.turnIndex]).toBe('ana');
  });

  it('tres dobles seguidos mandan a la cárcel', () => {
    let s = newGame(['ana', 'beto']);
    s = rollFull(s, 1, 1);
    s = rollFull(s, 1, 1);
    s = rollFull(s, 1, 1);
    const ana = s.players.find((p) => p.id === 'ana')!;
    expect(ana.inJail).toBe(true);
    expect(ana.position).toBe(10);
    expect(s.phase).toBe('TURN_END');
  });

  it('la casilla 30 manda a la cárcel', () => {
    let s = newGame(['ana', 'beto']);
    s = setPosition(s, 'ana', 25);
    s = rollAndResolve(s, 2, 3);
    const ana = s.players.find((p) => p.id === 'ana')!;
    expect(ana.inJail).toBe(true);
    expect(ana.position).toBe(10);
  });

  it('END_TURN pasa al siguiente jugador', () => {
    let s = newGame(['ana', 'beto']);
    s = rollFull(s, 3, 4);
    expect(s.phase).toBe('TURN_END');
    s = apply(s, { type: 'END_TURN', playerId: 'ana', at: AT });
    expect(s.order[s.turnIndex]).toBe('beto');
    expect(s.phase).toBe('ROLLING');
  });

  it('rechaza acciones fuera de turno', () => {
    const s = newGame(['ana', 'beto']);
    expect(expectFail(s, { type: 'ROLL_DICE', playerId: 'beto', at: AT })).toBe('not_your_turn');
  });

  it('rechaza tirar dos veces en la misma fase', () => {
    let s = newGame(['ana', 'beto']);
    const r = reduce({ ...s, _forcedDice: [3, 4] }, { type: 'ROLL_DICE', playerId: 'ana', at: AT });
    expect(r.state.phase).toBe('MOVING');
    expect(reduce(r.state, { type: 'ROLL_DICE', playerId: 'ana', at: AT }).error).toBe('wrong_phase');
  });
});

describe('cárcel', () => {
  function jailed() {
    let s = newGame(['ana', 'beto']);
    s = setPosition(s, 'ana', 25);
    s = rollFull(s, 2, 3); // cae en 30 → cárcel
    s = apply(s, { type: 'END_TURN', playerId: 'ana', at: AT });
    s = rollFull(s, 1, 2); // turno de beto
    s = apply(s, { type: 'END_TURN', playerId: 'beto', at: AT });
    return s;
  }

  it('sale con dobles sin obtener tirada extra', () => {
    let s = jailed();
    s = rollAndResolve(s, 4, 4);
    const ana = s.players.find((p) => p.id === 'ana')!;
    expect(ana.inJail).toBe(false);
    expect(ana.position).toBe(18);
    expect(s.phase).not.toBe('ROLLING');
  });

  it('pagar fianza libera y permite tirar', () => {
    let s = jailed();
    s = apply(s, { type: 'PAY_BAIL', playerId: 'ana', at: AT });
    expect(money(s, 'ana')).toBe(1500 - 50);
    expect(s.players.find((p) => p.id === 'ana')!.inJail).toBe(false);
    expect(s.phase).toBe('ROLLING');
  });

  it('la carta de indulto libera sin pagar', () => {
    let s = jailed();
    s = structuredClone(s);
    s.players.find((p) => p.id === 'ana')!.getOutCards = 1;
    s = apply(s, { type: 'USE_JAIL_CARD', playerId: 'ana', at: AT });
    const ana = s.players.find((p) => p.id === 'ana')!;
    expect(ana.inJail).toBe(false);
    expect(ana.getOutCards).toBe(0);
    expect(money(s, 'ana')).toBe(1500);
  });

  it('tras tres intentos fallidos paga la fianza obligatoria', () => {
    let s = jailed();
    s = structuredClone(s);
    s.players.find((p) => p.id === 'ana')!.jailTurns = 2;
    s = rollAndResolve(s, 1, 2);
    const ana = s.players.find((p) => p.id === 'ana')!;
    expect(ana.inJail).toBe(false);
    expect(money(s, 'ana')).toBe(1500 - 50);
    expect(ana.position).toBe(13);
  });
});
