'use client';

import { useEffect, useState } from 'react';
import type { GameState, Player, Trade } from '@collapolio/engine';
import { GROUP_COLORS } from '@collapolio/engine';
import { money } from '@/lib/format';
import { useI18n } from '../I18nProvider';
import { Modal } from './Modal';

interface Side {
  money: number;
  properties: number[];
  getOutCards: number;
}

const EMPTY: Side = { money: 0, properties: [], getOutCards: 0 };

function TileToggle({
  state,
  indices,
  selected,
  onToggle,
  d,
}: {
  state: GameState;
  indices: number[];
  selected: number[];
  onToggle: (i: number) => void;
  d: any;
}) {
  if (indices.length === 0) {
    return <p className="text-xs text-muted">—</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {indices.map((i) => {
        const tile = state.board[i];
        const on = selected.includes(i);
        const blocked = (tile.houses ?? 0) > 0;
        return (
          <li key={i}>
            <button
              disabled={blocked}
              onClick={() => onToggle(i)}
              title={blocked ? d.game.houses : undefined}
              className={`chip text-[11px] transition disabled:opacity-30 ${
                on ? 'border-brand bg-brand/25 text-fg' : 'text-muted'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: tile.group ? GROUP_COLORS[tile.group] : '#4a5570' }}
              />
              {(d.tile as Record<string, string>)[tile.name] ?? tile.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function TradeModal({
  open,
  onClose,
  state,
  you,
  initialPartner,
  onPropose,
}: {
  open: boolean;
  onClose: () => void;
  state: GameState;
  you: string | null;
  initialPartner?: string | null;
  onPropose: (to: string, offer: Side, request: Side, counterOf?: string) => void;
}) {
  const { d } = useI18n();
  const me = state.players.find((p) => p.id === you);
  const [partnerId, setPartnerId] = useState<string | null>(initialPartner ?? null);
  const [offer, setOffer] = useState<Side>(EMPTY);
  const [request, setRequest] = useState<Side>(EMPTY);

  useEffect(() => {
    if (open) {
      setPartnerId(initialPartner ?? null);
      setOffer(EMPTY);
      setRequest(EMPTY);
    }
  }, [open, initialPartner]);

  if (!me) return null;
  const others = state.players.filter((p) => p.id !== me.id && !p.bankrupt);
  const partner = others.find((p) => p.id === partnerId) ?? null;

  const toggle = (side: 'offer' | 'request', index: number) => {
    const setter = side === 'offer' ? setOffer : setRequest;
    setter((prev) => ({
      ...prev,
      properties: prev.properties.includes(index)
        ? prev.properties.filter((i) => i !== index)
        : [...prev.properties, index],
    }));
  };

  const valid =
    partner &&
    (offer.money > 0 ||
      offer.properties.length > 0 ||
      offer.getOutCards > 0 ||
      request.money > 0 ||
      request.properties.length > 0 ||
      request.getOutCards > 0) &&
    offer.money <= me.money &&
    request.money <= partner.money;

  return (
    <Modal open={open} onClose={onClose} title={d.game.trade} wide>
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {d.game.tradeWith}
        </p>
        <div className="flex flex-wrap gap-2">
          {others.map((p) => (
            <button
              key={p.id}
              onClick={() => setPartnerId(p.id)}
              className={`chip transition ${
                partnerId === p.id ? 'border-brand bg-brand/20 text-fg' : 'text-muted'
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.nick}
            </button>
          ))}
        </div>
      </div>

      {!partner ? (
        <p className="text-sm text-muted">{d.game.selectPlayer}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['offer', d.game.youGive, me, offer, setOffer] as const,
                ['request', d.game.youGet, partner, request, setRequest] as const,
              ] as const
            ).map(([key, label, player, side, setSide]) => (
              <section key={key} className="rounded-xl border border-line/10 bg-ink/40 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: player.color }}>
                  {label} · {player.nick}
                </p>

                <label className="mb-1 block text-[11px] text-muted">{d.game.cash}</label>
                <input
                  type="number"
                  className="field num mb-3 py-1.5 text-sm"
                  min={0}
                  max={player.money}
                  value={side.money}
                  onChange={(e) =>
                    setSide((prev) => ({
                      ...prev,
                      money: Math.max(0, Math.min(player.money, Number(e.target.value) || 0)),
                    }))
                  }
                />

                <p className="mb-1.5 text-[11px] text-muted">{d.game.properties}</p>
                <TileToggle
                  state={state}
                  indices={player.properties}
                  selected={side.properties}
                  onToggle={(i) => toggle(key, i)}
                  d={d}
                />

                {player.getOutCards > 0 && (
                  <label className="mt-3 flex items-center gap-2 text-[11px] text-muted">
                    <input
                      type="number"
                      className="field num w-16 py-1 text-sm"
                      min={0}
                      max={player.getOutCards}
                      value={side.getOutCards}
                      onChange={(e) =>
                        setSide((prev) => ({
                          ...prev,
                          getOutCards: Math.max(
                            0,
                            Math.min(player.getOutCards, Number(e.target.value) || 0),
                          ),
                        }))
                      }
                    />
                    {d.game.useCard}
                  </label>
                )}

                <p className="num mt-3 text-[11px] text-muted">
                  {d.game.cash}: {money(player.money)}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <button className="btn-ghost flex-1" onClick={onClose}>
              {d.game.cancel}
            </button>
            <button
              className="btn-primary flex-1"
              disabled={!valid}
              onClick={() => partner && onPropose(partner.id, offer, request)}
            >
              {d.game.propose}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/** Aviso de intercambio recibido, con aceptar / rechazar / contraofertar */
export function TradeInbox({
  trades,
  state,
  onRespond,
  onCounter,
}: {
  trades: Trade[];
  state: GameState;
  onRespond: (tradeId: string, accept: boolean) => void;
  onCounter: (trade: Trade) => void;
}) {
  const { d } = useI18n();
  const trade = trades[0];
  if (!trade) return null;

  const from = state.players.find((p) => p.id === trade.from.playerId);
  if (!from) return null;

  const describe = (side: { money: number; properties: number[]; getOutCards: number }) => {
    const parts: string[] = [];
    if (side.money > 0) parts.push(money(side.money));
    for (const i of side.properties) {
      parts.push((d.tile as Record<string, string>)[state.board[i].name] ?? state.board[i].name);
    }
    if (side.getOutCards > 0) parts.push(`${side.getOutCards}× ${d.game.useCard}`);
    return parts.length ? parts.join(' · ') : '—';
  };

  return (
    <Modal open title={`${d.game.trade} · ${from.nick}`}>
      <div className="space-y-3">
        <div className="rounded-xl border border-mint/30 bg-mint/5 p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-mint">
            {d.game.youGet}
          </p>
          <p className="text-sm">{describe(trade.from)}</p>
        </div>
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-danger">
            {d.game.youGive}
          </p>
          <p className="text-sm">{describe(trade.to)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-ghost flex-1" onClick={() => onRespond(trade.id, false)}>
          {d.game.reject}
        </button>
        <button className="btn-ghost flex-1" onClick={() => onCounter(trade)}>
          {d.game.counter}
        </button>
        <button className="btn-mint flex-1" onClick={() => onRespond(trade.id, true)}>
          {d.game.accept}
        </button>
      </div>
    </Modal>
  );
}
