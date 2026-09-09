'use client';

import { useEffect, useState } from 'react';
import type { GameState, Player, Trade } from '@collapolio/engine';
import { GROUP_COLORS } from '@collapolio/engine';
import { money } from '@/lib/format';
import { Avatar } from '../Avatar';
import { useI18n } from '../I18nProvider';
import { Modal } from './Modal';

interface Side {
  money: number;
  properties: number[];
  getOutCards: number;
}

const VACIO: Side = { money: 0, properties: [], getOutCards: 0 };

/** Deslizador de efectivo con el valor en una pastilla, como en el panel de referencia */
function CashSlider({
  max,
  value,
  color,
  onChange,
}: {
  max: number;
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="px-1">
      <input
        type="range"
        min={0}
        max={max}
        step={max > 2000 ? 10 : 1}
        value={Math.min(value, max)}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="efectivo"
        className="w-full cursor-pointer accent-[rgb(var(--c-brand))]"
        style={{ accentColor: color }}
      />
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
        <span className="num">0</span>
        <span
          className="num rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white"
          style={{ background: 'rgb(var(--c-brand))' }}
        >
          {value} $
        </span>
        <span className="num">{max}</span>
      </div>
    </div>
  );
}

/** Columna de un lado del intercambio */
function LadoTrade({
  player,
  side,
  setSide,
  state,
  d,
}: {
  player: Player;
  side: Side;
  setSide: (fn: (prev: Side) => Side) => void;
  state: GameState;
  d: any;
}) {
  const alternar = (index: number) =>
    setSide((prev) => ({
      ...prev,
      properties: prev.properties.includes(index)
        ? prev.properties.filter((i) => i !== index)
        : [...prev.properties, index],
    }));

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3">
      <header className="flex items-center justify-center gap-2">
        <span
          className="grid h-7 w-7 place-items-center rounded-full border"
          style={{ borderColor: player.color, background: `${player.color}22` }}
        >
          <Avatar avatar={player.avatar} color={player.color} size={16} />
        </span>
        <span className="truncate text-sm font-bold">{player.nick}</span>
      </header>

      <CashSlider
        max={player.money}
        value={side.money}
        color={player.color}
        onChange={(v) => setSide((prev) => ({ ...prev, money: v }))}
      />

      <ul className="min-h-0 space-y-1.5 overflow-y-auto">
        {player.properties.length === 0 && (
          <li className="rounded-xl border border-dashed border-line/15 py-4 text-center text-[12px] text-muted">
            —
          </li>
        )}
        {player.properties.map((i) => {
          const tile = state.board[i];
          const activa = side.properties.includes(i);
          const conCasas = (tile.houses ?? 0) > 0;
          const nombre = (d.tile as Record<string, string>)[tile.name] ?? tile.name;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={conCasas}
                onClick={() => alternar(i)}
                title={conCasas ? d.errors.trade_has_houses : undefined}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-30 ${
                  activa
                    ? 'border-brand bg-brand/20'
                    : 'border-line/10 bg-ink/50 hover:border-line/25'
                }`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded"
                  style={{ background: tile.group ? GROUP_COLORS[tile.group] : '#4a5570' }}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{nombre}</span>
                <span className="num shrink-0 text-[13px] font-bold text-muted">
                  ${tile.price ?? 0}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {player.getOutCards > 0 && (
        <label className="flex items-center justify-center gap-2 text-[12px] text-muted">
          <input
            type="number"
            className="field num w-16 py-1 text-center text-sm"
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
    </section>
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
  onPropose: (to: string, offer: Side, request: Side) => void;
}) {
  const { d } = useI18n();
  const me = state.players.find((p) => p.id === you);
  const [partnerId, setPartnerId] = useState<string | null>(initialPartner ?? null);
  const [offer, setOffer] = useState<Side>(VACIO);
  const [request, setRequest] = useState<Side>(VACIO);

  useEffect(() => {
    if (open) {
      setPartnerId(initialPartner ?? null);
      setOffer(VACIO);
      setRequest(VACIO);
    }
  }, [open, initialPartner]);

  if (!me) return null;
  const otros = state.players.filter((p) => p.id !== me.id && !p.bankrupt);
  const partner = otros.find((p) => p.id === partnerId) ?? null;

  // Paso 1: elegir con quién negociar
  if (!partner) {
    return (
      <Modal open={open} onClose={onClose} title={d.game.trade}>
        <p className="mb-4 text-center text-sm text-muted">{d.game.selectPlayer}</p>
        <ul className="space-y-2">
          {otros.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setPartnerId(p.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-line/10 bg-ink/50 px-4 py-3 text-left transition hover:border-brand/50 hover:bg-brand/10"
              >
                <span
                  className="grid h-8 w-8 place-items-center rounded-full border"
                  style={{ borderColor: p.color, background: `${p.color}22` }}
                >
                  <Avatar avatar={p.avatar} color={p.color} size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{p.nick}</span>
                <span className="num text-sm text-muted">{money(p.money)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    );
  }

  const algoEnJuego =
    offer.money > 0 ||
    offer.properties.length > 0 ||
    offer.getOutCards > 0 ||
    request.money > 0 ||
    request.properties.length > 0 ||
    request.getOutCards > 0;

  return (
    <Modal open={open} onClose={onClose} title={d.game.trade} wide>
      <div className="flex gap-3">
        <LadoTrade player={me} side={offer} setSide={setOffer} state={state} d={d} />

        {/* Invierte los dos lados de la oferta */}
        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            aria-label={d.game.swap}
            title={d.game.swap}
            onClick={() => {
              const a = offer;
              setOffer({ ...request, money: Math.min(request.money, me.money) });
              setRequest({ ...a, money: Math.min(a.money, partner.money) });
              setPartnerId(partner.id);
            }}
            className="grid h-10 w-10 place-items-center rounded-full border border-line/15 bg-raised text-muted transition hover:scale-105 hover:text-fg"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 8h13m0 0-4-4m4 4-4 4M17 16H4m0 0 4 4m-4-4 4-4" />
            </svg>
          </button>
        </div>

        <LadoTrade player={partner} side={request} setSide={setRequest} state={state} d={d} />
      </div>

      <div className="mt-5 flex gap-2">
        <button className="btn-ghost flex-1" onClick={() => setPartnerId(null)}>
          {d.game.changePlayer}
        </button>
        <button
          className="btn-primary flex-[2]"
          disabled={!algoEnJuego}
          onClick={() => onPropose(partner.id, offer, request)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 3 18 9-18 9 4-9z" />
          </svg>
          {d.game.sendTrade}
        </button>
      </div>
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

  const describir = (side: Side) => {
    const partes: string[] = [];
    if (side.money > 0) partes.push(money(side.money));
    for (const i of side.properties) {
      partes.push((d.tile as Record<string, string>)[state.board[i].name] ?? state.board[i].name);
    }
    if (side.getOutCards > 0) partes.push(`${side.getOutCards}× ${d.game.useCard}`);
    return partes.length ? partes.join(' · ') : '—';
  };

  return (
    <Modal open title={`${d.game.trade} · ${from.nick}`}>
      <div className="space-y-3">
        <div className="rounded-xl border border-mint/30 bg-mint/5 p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-mint">
            {d.game.youGet}
          </p>
          <p className="text-sm">{describir(trade.from)}</p>
        </div>
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-danger">
            {d.game.youGive}
          </p>
          <p className="text-sm">{describir(trade.to)}</p>
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
