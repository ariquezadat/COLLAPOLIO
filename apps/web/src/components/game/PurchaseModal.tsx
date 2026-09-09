'use client';

import type { GameState } from '@collapolio/engine';
import { GROUP_COLORS, RAIL_RENT } from '@collapolio/engine';
import { money } from '@/lib/format';
import { useI18n } from '../I18nProvider';
import { Modal } from './Modal';

export function PurchaseModal({
  state,
  you,
  onBuy,
  onDecline,
}: {
  state: GameState;
  you: string | null;
  onBuy: () => void;
  onDecline: () => void;
}) {
  const { d } = useI18n();
  const isMine = state.order[state.turnIndex] === you;
  const open = state.phase === 'AWAITING_ACTION' && !!state.pendingPurchase && isMine;
  const tile = state.pendingPurchase ? state.board[state.pendingPurchase.tileIndex] : null;
  const me = state.players.find((p) => p.id === you);
  if (!tile || !me) return null;

  const name = (d.tile as Record<string, string>)[tile.name] ?? tile.name;
  const canAfford = me.money >= (tile.price ?? 0);

  return (
    <Modal open={open} title={d.game.buyTitle.replace('{tile}', name)}>
      <div
        className="mb-4 overflow-hidden rounded-xl border border-line/10"
        style={{ background: 'rgb(var(--c-ink) / 0.6)' }}
      >
        <div
          className="h-3"
          style={{ background: tile.group ? GROUP_COLORS[tile.group] : '#4a5570' }}
        />
        <div className="p-4">
          <p className="text-lg font-bold">{name}</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{d.game.price}</dt>
              <dd className="num font-bold">{money(tile.price ?? 0)}</dd>
            </div>

            {tile.type === 'PROPERTY' && tile.rentTable && (
              <>
                {tile.rentTable.map((r, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <dt className="text-muted">
                      {i === 0
                        ? d.game.rent
                        : i === 5
                          ? d.game.hotel
                          : `${i} ${d.game.houses}`}
                    </dt>
                    <dd className="num">{money(r)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-line/10 pt-1.5 text-xs">
                  <dt className="text-muted">{d.game.build}</dt>
                  <dd className="num">{money(tile.houseCost ?? 0)}</dd>
                </div>
              </>
            )}

            {tile.type === 'RAIL' && (
              <div className="flex justify-between text-xs">
                <dt className="text-muted">{d.game.rent}</dt>
                <dd className="num">{RAIL_RENT.slice(1).map((r) => `$${r}`).join(' · ')}</dd>
              </div>
            )}

            {tile.type === 'UTILITY' && (
              <div className="flex justify-between text-xs">
                <dt className="text-muted">{d.game.rent}</dt>
                <dd className="num">4× / 10×</dd>
              </div>
            )}

            <div className="flex justify-between border-t border-line/10 pt-1.5 text-xs">
              <dt className="text-muted">{d.game.mortgage}</dt>
              <dd className="num">{money(tile.mortgageValue ?? 0)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={onDecline}>
          {state.settings.allowAuctions ? d.game.auction : d.game.pass}
        </button>
        <button className="btn-mint flex-1" onClick={onBuy} disabled={!canAfford}>
          {d.game.buy} · {money(tile.price ?? 0)}
        </button>
      </div>
    </Modal>
  );
}
