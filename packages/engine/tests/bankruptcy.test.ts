import { describe, expect, it } from 'vitest';
import { apply, expectFail, giveTiles, money, newGame, rollAndResolve, setMoney, setPosition, tile, AT } from './helpers.js';
import { reduce } from '../src/reducer.js';

describe('deuda y quiebra', () => {
  it('abre una deuda cuando el efectivo no alcanza la renta', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'beto', [39]); // EUPHORIA, la casilla más cara
    const withHouse = structuredClone(s);
    withHouse.board[39].houses = 1; // renta 200
    s = setPosition(withHouse, 'ana', 35);
    s = setMoney(s, 'ana', 100);
    s = giveTiles(s, 'ana', [6, 8, 9]); // puede liquidar hasta $160 extra
    s = rollAndResolve(s, 2, 2);
    expect(s.debt).not.toBeNull();
    expect(s.debt!.amount).toBe(200);
    expect(s.debt!.creditorId).toBe('beto');
    expect(s.phase).toBe('AWAITING_ACTION');
    // La renta todavía no se pagó: sigue con su efectivo intacto
    expect(money(s, 'ana')).toBe(100);
  });

  it('quiebra automática si ni liquidando todo alcanza', () => {
    let s = newGame(['ana', 'beto']);
    const withHotel = structuredClone(s);
    withHotel.board[39].ownerId = 'beto';
    withHotel.players.find((p) => p.id === 'beto')!.properties = [39];
    withHotel.board[39].houses = 5;
    s = setMoney(withHotel, 'ana', 100);
    s = setPosition(s, 'ana', 35);
    s = rollAndResolve(s, 2, 2);
    const ana = s.players.find((p) => p.id === 'ana')!;
    expect(ana.bankrupt).toBe(true);
    expect(s.phase).toBe('GAME_OVER');
    expect(s.winnerId).toBe('beto');
  });

  it('los activos del quebrado pasan al acreedor', () => {
    let s = newGame(['ana', 'beto', 'caro']);
    s = giveTiles(s, 'beto', [39]);
    const withHotel = structuredClone(s);
    withHotel.board[39].houses = 5;
    s = giveTiles(withHotel, 'ana', [1, 3]); // adobe, valor de liquidación bajo
    s = setMoney(s, 'ana', 50);
    s = setPosition(s, 'ana', 35);
    s = rollAndResolve(s, 2, 2);
    const ana = s.players.find((p) => p.id === 'ana')!;
    expect(ana.bankrupt).toBe(true);
    expect(tile(s, 1).ownerId).toBe('beto');
    expect(tile(s, 3).ownerId).toBe('beto');
    expect(s.phase).not.toBe('GAME_OVER'); // queda caro en pie
  });

  it('al quebrar contra el banco las propiedades vuelven a estar libres', () => {
    let s = newGame(['ana', 'beto', 'caro']);
    s = giveTiles(s, 'ana', [1, 3]);
    s = setMoney(s, 'ana', 5);
    s = setPosition(s, 'ana', 37); // 37 + 5 = 42 → 2... usamos impuesto directo
    s = setPosition(s, 'ana', 2);
    s = rollAndResolve(s, 1, 1); // 2 → 4 impuesto de $200
    // no alcanza ni liquidando ($5 + 30 + 30 = 65)
    const ana = s.players.find((p) => p.id === 'ana')!;
    expect(ana.bankrupt).toBe(true);
    expect(tile(s, 1).ownerId).toBeNull();
    expect(tile(s, 3).ownerId).toBeNull();
  });

  it('hipotecar durante la deuda la salda automáticamente', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'beto', [39]);
    const withHouses = structuredClone(s);
    withHouses.board[39].houses = 1; // renta 200
    s = giveTiles(withHouses, 'ana', [37]); // hipoteca 175
    s = setMoney(s, 'ana', 100);
    s = setPosition(s, 'ana', 35);
    s = rollAndResolve(s, 2, 2);
    expect(s.debt!.amount).toBe(200);
    s = apply(s, { type: 'MORTGAGE', playerId: 'ana', tileIndex: 37, at: AT });
    expect(s.debt).toBeNull();
    expect(money(s, 'ana')).toBe(100 + 175 - 200);
    expect(money(s, 'beto')).toBe(1500 + 200);
  });

  it('declararse en quiebra voluntariamente entrega los activos', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'beto', [39]);
    const withHouses = structuredClone(s);
    withHouses.board[39].houses = 1;
    s = giveTiles(withHouses, 'ana', [37]);
    s = setMoney(s, 'ana', 100);
    s = setPosition(s, 'ana', 35);
    s = rollAndResolve(s, 2, 2);
    s = apply(s, { type: 'DECLARE_BANKRUPTCY', playerId: 'ana', at: AT });
    expect(s.players.find((p) => p.id === 'ana')!.bankrupt).toBe(true);
    expect(tile(s, 37).ownerId).toBe('beto');
    expect(s.phase).toBe('GAME_OVER');
  });

  it('el último en pie gana', () => {
    let s = newGame(['ana', 'beto']);
    s = setMoney(s, 'ana', 1);
    s = setPosition(s, 'ana', 2);
    s = rollAndResolve(s, 1, 1); // impuesto $200
    expect(s.phase).toBe('GAME_OVER');
    expect(s.winnerId).toBe('beto');
  });
});

describe('rendirse (bancarrota voluntaria)', () => {
  it('se puede abandonar sin tener deuda y los activos vuelven al banco', () => {
    let s = newGame(['ana', 'beto', 'caro']);
    s = giveTiles(s, 'ana', [6, 8]);
    s = apply(s, { type: 'DECLARE_BANKRUPTCY', playerId: 'ana', at: AT });
    const ana = s.players.find((p) => p.id === 'ana')!;
    expect(ana.bankrupt).toBe(true);
    expect(ana.money).toBe(0);
    expect(tile(s, 6).ownerId).toBeNull();
    expect(tile(s, 8).ownerId).toBeNull();
    expect(s.phase).not.toBe('GAME_OVER');
  });

  it('rendirse fuera de turno no rompe el turno de otro', () => {
    let s = newGame(['ana', 'beto', 'caro']);
    expect(s.order[s.turnIndex]).toBe('ana');
    s = apply(s, { type: 'DECLARE_BANKRUPTCY', playerId: 'beto', at: AT });
    expect(s.players.find((p) => p.id === 'beto')!.bankrupt).toBe(true);
    expect(s.order[s.turnIndex]).toBe('ana');
    expect(s.phase).toBe('ROLLING');
  });

  it('si se rinde el jugador en turno, pasa al siguiente', () => {
    let s = newGame(['ana', 'beto', 'caro']);
    s = apply(s, { type: 'DECLARE_BANKRUPTCY', playerId: 'ana', at: AT });
    expect(s.order[s.turnIndex]).toBe('beto');
    expect(s.phase).toBe('ROLLING');
  });

  it('rendirse deja la partida con un ganador si sólo queda uno', () => {
    let s = newGame(['ana', 'beto']);
    s = apply(s, { type: 'DECLARE_BANKRUPTCY', playerId: 'ana', at: AT });
    expect(s.phase).toBe('GAME_OVER');
    expect(s.winnerId).toBe('beto');
  });

  it('rendirse durante una subasta no la deja colgada', () => {
    let s = newGame(['ana', 'beto', 'caro']);
    s = rollAndResolve(s, 2, 4); // 0 → 6, libre
    s = apply(s, { type: 'DECLINE_PURCHASE', playerId: 'ana', at: AT });
    expect(s.phase).toBe('AUCTION');
    s = apply(s, { type: 'BID', playerId: 'beto', amount: 50, at: AT });
    s = apply(s, { type: 'PASS_BID', playerId: 'caro', at: AT });
    // Queda ana pujando; si se rinde, gana beto y la subasta se cierra
    s = apply(s, { type: 'DECLARE_BANKRUPTCY', playerId: 'ana', at: AT });
    expect(s.auction).toBeNull();
    expect(tile(s, 6).ownerId).toBe('beto');
  });

  it('no se puede abandonar dos veces', () => {
    let s = newGame(['ana', 'beto', 'caro']);
    s = apply(s, { type: 'DECLARE_BANKRUPTCY', playerId: 'ana', at: AT });
    expect(expectFail(s, { type: 'DECLARE_BANKRUPTCY', playerId: 'ana', at: AT })).toBe('no_player');
  });
});
