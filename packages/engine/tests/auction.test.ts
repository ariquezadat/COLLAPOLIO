import { describe, expect, it } from 'vitest';
import { apply, expectFail, money, newGame, rollAndResolve, setMoney, tile, AT } from './helpers.js';
import { reduce } from '../src/reducer.js';

/** Deja el estado con una subasta abierta por la casilla 6 (El Mirador, $100) */
function auctionOpen(nicks = ['ana', 'beto', 'caro']) {
  let s = newGame(nicks);
  s = rollAndResolve(s, 2, 4); // 0 → 6, libre
  expect(s.phase).toBe('AWAITING_ACTION');
  s = apply(s, { type: 'DECLINE_PURCHASE', playerId: 'ana', at: AT });
  expect(s.phase).toBe('AUCTION');
  return s;
}

describe('subastas', () => {
  it('rechazar la compra abre la subasta con todos los jugadores', () => {
    const s = auctionOpen();
    expect(s.auction!.tileIndex).toBe(6);
    expect(s.auction!.activeBidders).toHaveLength(3);
    expect(s.auction!.highestBid).toBe(0);
  });

  it('sin subastas activadas la casilla queda libre y sigue el turno', () => {
    let s = newGame(['ana', 'beto'], { allowAuctions: false });
    s = rollAndResolve(s, 2, 4);
    s = apply(s, { type: 'DECLINE_PURCHASE', playerId: 'ana', at: AT });
    expect(s.phase).toBe('TURN_END');
    expect(tile(s, 6).ownerId).toBeNull();
  });

  it('exige superar la puja máxima por el incremento mínimo', () => {
    let s = auctionOpen();
    s = apply(s, { type: 'BID', playerId: 'beto', amount: 50, at: AT });
    expect(expectFail(s, { type: 'BID', playerId: 'caro', amount: 55, at: AT })).toBe('bid_too_low');
    s = apply(s, { type: 'BID', playerId: 'caro', amount: 60, at: AT });
    expect(s.auction!.highestBidderId).toBe('caro');
  });

  it('no permite pujar más de lo que se tiene', () => {
    let s = auctionOpen();
    s = setMoney(s, 'beto', 40);
    expect(expectFail(s, { type: 'BID', playerId: 'beto', amount: 50, at: AT })).toBe('no_money');
  });

  it('cada puja reinicia el temporizador', () => {
    let s = auctionOpen();
    const d0 = s.auction!.deadline;
    s = apply(s, { type: 'BID', playerId: 'beto', amount: 20, at: AT + 4000 });
    expect(s.auction!.deadline).toBeGreaterThan(d0);
  });

  it('gana el mayor postor cuando los demás pasan', () => {
    let s = auctionOpen();
    s = apply(s, { type: 'BID', playerId: 'beto', amount: 70, at: AT });
    s = apply(s, { type: 'PASS_BID', playerId: 'ana', at: AT });
    s = apply(s, { type: 'PASS_BID', playerId: 'caro', at: AT });
    expect(s.auction).toBeNull();
    expect(tile(s, 6).ownerId).toBe('beto');
    expect(money(s, 'beto')).toBe(1500 - 70);
    expect(s.phase).toBe('TURN_END');
  });

  it('gana el mayor postor cuando vence el temporizador', () => {
    let s = auctionOpen();
    s = apply(s, { type: 'BID', playerId: 'caro', amount: 130, at: AT });
    const r = reduce(s, { type: 'TICK', at: AT + 11_000 });
    expect(r.state.auction).toBeNull();
    expect(r.state.board[6].ownerId).toBe('caro');
    expect(r.state.players.find((p) => p.id === 'caro')!.money).toBe(1500 - 130);
  });

  it('si nadie puja la casilla queda sin dueño', () => {
    let s = auctionOpen();
    s = apply(s, { type: 'PASS_BID', playerId: 'ana', at: AT });
    s = apply(s, { type: 'PASS_BID', playerId: 'beto', at: AT });
    s = apply(s, { type: 'PASS_BID', playerId: 'caro', at: AT });
    expect(tile(s, 6).ownerId).toBeNull();
    expect(s.phase).toBe('TURN_END');
  });

  it('quien ya pasó no puede volver a pujar', () => {
    let s = auctionOpen();
    s = apply(s, { type: 'PASS_BID', playerId: 'beto', at: AT });
    expect(expectFail(s, { type: 'BID', playerId: 'beto', amount: 100, at: AT })).toBe('not_bidding');
  });
});
