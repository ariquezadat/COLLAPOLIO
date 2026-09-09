import { describe, expect, it } from 'vitest';
import { apply, expectFail, giveTiles, money, newGame, tile, AT } from './helpers.js';

function propose(s: any, extra: any = {}) {
  return apply(s, {
    type: 'PROPOSE_TRADE',
    playerId: 'ana',
    tradeId: 't1',
    to: 'beto',
    offer: { money: 100, properties: [6], getOutCards: 0 },
    request: { money: 0, properties: [8], getOutCards: 0 },
    at: AT,
    ...extra,
  });
}

describe('intercambios', () => {
  it('ejecuta el intercambio cuando la contraparte acepta', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'ana', [6]);
    s = giveTiles(s, 'beto', [8]);
    s = propose(s);
    expect(s.trades[0].status).toBe('PENDING');
    s = apply(s, { type: 'RESPOND_TRADE', playerId: 'beto', tradeId: 't1', accept: true, at: AT });
    expect(tile(s, 6).ownerId).toBe('beto');
    expect(tile(s, 8).ownerId).toBe('ana');
    expect(money(s, 'ana')).toBe(1400);
    expect(money(s, 'beto')).toBe(1600);
    expect(s.trades[0].status).toBe('ACCEPTED');
  });

  it('rechazar deja todo intacto', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'ana', [6]);
    s = giveTiles(s, 'beto', [8]);
    s = propose(s);
    s = apply(s, { type: 'RESPOND_TRADE', playerId: 'beto', tradeId: 't1', accept: false, at: AT });
    expect(tile(s, 6).ownerId).toBe('ana');
    expect(s.trades[0].status).toBe('REJECTED');
  });

  it('sólo el destinatario puede responder', () => {
    let s = newGame(['ana', 'beto', 'caro']);
    s = giveTiles(s, 'ana', [6]);
    s = giveTiles(s, 'beto', [8]);
    s = propose(s);
    expect(
      expectFail(s, { type: 'RESPOND_TRADE', playerId: 'caro', tradeId: 't1', accept: true, at: AT }),
    ).toBe('not_recipient');
  });

  it('no se pueden intercambiar propiedades con casas', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'ana', [6, 8, 9]);
    s = apply(s, { type: 'BUILD_HOUSE', playerId: 'ana', tileIndex: 6, at: AT });
    expect(
      expectFail(s, {
        type: 'PROPOSE_TRADE',
        playerId: 'ana',
        tradeId: 't2',
        to: 'beto',
        offer: { money: 0, properties: [6], getOutCards: 0 },
        request: { money: 0, properties: [], getOutCards: 0 },
        at: AT,
      }),
    ).toBe('trade_has_houses');
  });

  it('no se puede ofrecer dinero que no se tiene', () => {
    let s = newGame(['ana', 'beto']);
    expect(
      expectFail(s, {
        type: 'PROPOSE_TRADE',
        playerId: 'ana',
        tradeId: 't3',
        to: 'beto',
        offer: { money: 99_999, properties: [], getOutCards: 0 },
        request: { money: 0, properties: [], getOutCards: 0 },
        at: AT,
      }),
    ).toBe('trade_no_money');
  });

  it('la contraoferta rechaza la propuesta original', () => {
    let s = newGame(['ana', 'beto']);
    s = giveTiles(s, 'ana', [6]);
    s = giveTiles(s, 'beto', [8]);
    s = propose(s);
    s = apply(s, {
      type: 'PROPOSE_TRADE',
      playerId: 'beto',
      tradeId: 't2',
      to: 'ana',
      offer: { money: 0, properties: [8], getOutCards: 0 },
      request: { money: 200, properties: [6], getOutCards: 0 },
      counterOf: 't1',
      at: AT,
    });
    expect(s.trades.find((t: any) => t.id === 't1')!.status).toBe('REJECTED');
    expect(s.trades.find((t: any) => t.id === 't2')!.status).toBe('PENDING');
  });
});
