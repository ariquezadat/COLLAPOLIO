'use client';

import { useEffect, useState } from 'react';
import type { GameState } from '@collapolio/engine';
import { GROUP_COLORS } from '@collapolio/engine';
import { money } from '@/lib/format';
import { useI18n } from '../I18nProvider';
import { Modal } from './Modal';

export function AuctionModal({
  state,
  you,
  skew,
  onBid,
  onPass,
}: {
  state: GameState;
  you: string | null;
  skew: number;
  onBid: (amount: number) => void;
  onPass: () => void;
}) {
  const { d } = useI18n();
  const auction = state.auction;
  const [amount, setAmount] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const min = auction ? auction.highestBid + state.settings.bidIncrement : 0;

  useEffect(() => {
    if (auction) setAmount(min);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.highestBid, auction?.tileIndex]);

  useEffect(() => {
    if (!auction) return;
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, [auction]);

  if (!auction) return null;

  const tile = state.board[auction.tileIndex];
  const name = (d.tile as Record<string, string>)[tile.name] ?? tile.name;
  const me = state.players.find((p) => p.id === you);
  const canBid = !!me && auction.activeBidders.includes(me.id);
  const leader = state.players.find((p) => p.id === auction.highestBidderId);
  const secondsLeft = Math.max(0, Math.ceil((auction.deadline - (now + skew)) / 1000));
  const ratio = Math.max(0, Math.min(1, (auction.deadline - (now + skew)) / (state.settings.auctionTimer * 1000)));

  return (
    <Modal open title={d.game.auctionTitle}>
      <div className="mb-4 overflow-hidden rounded-xl border border-line/10 bg-ink/50">
        <div className="h-3" style={{ background: tile.group ? GROUP_COLORS[tile.group] : '#4a5570' }} />
        <div className="p-4">
          <p className="text-sm text-muted">{d.game.auctionOf.replace('{tile}', '')}</p>
          <p className="text-lg font-bold">{name}</p>
          <p className="num mt-1 text-xs text-muted">
            {d.game.price}: {money(tile.price ?? 0)}
          </p>
        </div>
      </div>

      {/* Temporizador que se reinicia con cada puja */}
      <div className="mb-4">
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="text-muted">
            {leader
              ? `${d.game.highestBid}: ${leader.nick}`
              : d.game.noBids}
          </span>
          <span className="num font-bold">{secondsLeft}s</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink">
          <div
            className="h-full rounded-full transition-[width] duration-200 ease-linear"
            style={{
              width: `${ratio * 100}%`,
              background: ratio < 0.3 ? 'rgb(255 92 122)' : 'rgb(124 107 255)',
            }}
          />
        </div>
        <p className="num mt-2 text-center text-2xl font-extrabold">
          {auction.highestBid > 0 ? money(auction.highestBid) : '—'}
        </p>
      </div>

      {/* Postores */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {state.players
          .filter((p) => !p.bankrupt)
          .map((p) => {
            const active = auction.activeBidders.includes(p.id);
            return (
              <span
                key={p.id}
                className={`chip text-[11px] ${active ? '' : 'opacity-40 line-through'}`}
                style={active ? { borderColor: `${p.color}66`, color: p.color } : undefined}
              >
                {p.nick}
              </span>
            );
          })}
      </div>

      {canBid ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onBid(amount);
          }}
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">{d.game.yourBid}</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="field num"
                min={min}
                max={me!.money}
                step={state.settings.bidIncrement}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <button
                type="button"
                className="btn-ghost shrink-0"
                onClick={() => setAmount(Math.min(me!.money, amount + state.settings.bidIncrement))}
              >
                +{state.settings.bidIncrement}
              </button>
            </div>
            <p className="num mt-1 text-[11px] text-muted">
              {d.game.cash}: {money(me!.money)} · mín. {money(min)}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={onPass}>
              {d.game.pass}
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={amount < min || amount > me!.money}
            >
              {d.game.bid}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-center text-sm text-muted">{d.game.spectating}</p>
      )}
    </Modal>
  );
}
