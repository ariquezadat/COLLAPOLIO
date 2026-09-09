'use client';

import { useState } from 'react';
import type { GameSettings, GameState } from '@collapolio/engine';
import { money } from '@/lib/format';
import { Avatar } from '../Avatar';
import { useI18n } from '../I18nProvider';

function Toggle({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-xl border border-line/10 bg-ink/40 px-3 py-2.5 ${
        disabled ? 'opacity-60' : 'cursor-pointer'
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          value ? 'bg-brand' : 'bg-raised'
        }`}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
          style={{ left: value ? 22 : 2 }}
        />
      </button>
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className={`rounded-xl border border-line/10 bg-ink/40 px-3 py-2.5 ${disabled ? 'opacity-60' : ''}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="num text-sm font-bold text-brand">{format(value)}</span>
      </div>
      <input
        type="range"
        className="w-full accent-[rgb(var(--c-brand))]"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Lobby({
  state,
  you,
  code,
  onAction,
}: {
  state: GameState;
  you: string | null;
  code: string;
  onAction: (event: string, payload?: unknown) => void;
}) {
  const { d } = useI18n();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const isHost = state.hostId === you;
  const s = state.settings;

  const setSetting = (patch: Partial<GameSettings>) =>
    onAction('set_settings', { settings: patch });

  async function copy(kind: 'code' | 'link') {
    // Enlace corto y compartible; Firebase Hosting lo redirige a la sala
    const text = kind === 'code' ? code : `${window.location.origin}/j/${code}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* el navegador puede bloquear el portapapeles */
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      {/* Jugadores */}
      <section className="surface flex flex-col p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          {d.lobby.players} · {state.players.length}/{s.maxPlayers}
        </h2>

        <ul className="space-y-2">
          {state.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2.5 rounded-xl border border-line/10 bg-ink/40 p-2.5"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
                style={{ borderColor: p.color, background: `${p.color}22` }}
              >
                <Avatar avatar={p.avatar} color={p.color} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.nick}</p>
                <p className="text-[11px] text-muted">
                  {p.id === state.hostId && <span className="text-warn">{d.lobby.host}</span>}
                  {p.id === state.hostId && p.isBot && ' · '}
                  {p.isBot && <span>{d.game.bot}</span>}
                  {p.id === you && <span className="text-brand"> ({d.lobby.you})</span>}
                </p>
              </div>
              {isHost && p.id !== you && (
                <button
                  className="chip px-2 py-0.5 text-[10px] text-muted hover:text-danger"
                  onClick={() => onAction('kick_player', { targetId: p.id })}
                >
                  {d.lobby.kick}
                </button>
              )}
            </li>
          ))}
        </ul>

        {isHost && state.players.length < s.maxPlayers && (
          <button className="btn-ghost mt-3 w-full" onClick={() => onAction('add_bot')}>
            + {d.lobby.addBot}
          </button>
        )}

        <div className="mt-4 rounded-xl border border-line/10 bg-ink/40 p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
            {d.lobby.invite}
          </p>
          <p className="num mb-2.5 text-2xl font-extrabold tracking-[0.3em] text-brand">{code}</p>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1 py-1.5 text-xs" onClick={() => void copy('code')}>
              {copied === 'code' ? d.lobby.copied : d.lobby.copy}
            </button>
            <button className="btn-ghost flex-1 py-1.5 text-xs" onClick={() => void copy('link')}>
              {copied === 'link' ? d.lobby.copied : d.lobby.copyLink}
            </button>
          </div>
        </div>

        <div className="mt-4">
          {isHost ? (
            <button
              className="btn-primary w-full py-3"
              disabled={state.players.length < 2}
              onClick={() => onAction('start_game')}
            >
              {d.lobby.start}
            </button>
          ) : (
            <p className="text-center text-sm text-muted">{d.lobby.waiting}</p>
          )}
          {isHost && state.players.length < 2 && (
            <p className="mt-2 text-center text-xs text-muted">{d.lobby.needPlayers}</p>
          )}
        </div>
      </section>

      {/* Ajustes */}
      <section className="surface p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            {d.lobby.settings}
          </h2>
          {!isHost && <span className="text-[11px] text-muted">{d.lobby.hostOnly}</span>}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Slider
            label={d.settings.startingCash}
            value={s.startingCash}
            min={200}
            max={5000}
            step={100}
            format={money}
            disabled={!isHost}
            onChange={(v) => setSetting({ startingCash: v })}
          />
          <Slider
            label={d.settings.maxPlayers}
            value={s.maxPlayers}
            min={2}
            max={8}
            step={1}
            format={(v) => String(v)}
            disabled={!isHost}
            onChange={(v) => setSetting({ maxPlayers: v })}
          />
          <Slider
            label={d.settings.turnTimer}
            value={s.turnTimer}
            min={0}
            max={180}
            step={10}
            format={(v) => (v === 0 ? d.settings.noLimit : `${v}${d.settings.seconds}`)}
            disabled={!isHost}
            onChange={(v) => setSetting({ turnTimer: v })}
          />
          <Slider
            label={d.settings.goSalary}
            value={s.goSalary}
            min={0}
            max={600}
            step={50}
            format={money}
            disabled={!isHost}
            onChange={(v) => setSetting({ goSalary: v })}
          />
          <Slider
            label={d.settings.auctionTimer}
            value={s.auctionTimer}
            min={5}
            max={30}
            step={1}
            format={(v) => `${v}${d.settings.seconds}`}
            disabled={!isHost}
            onChange={(v) => setSetting({ auctionTimer: v })}
          />
          <Slider
            label={d.settings.bidIncrement}
            value={s.bidIncrement}
            min={1}
            max={100}
            step={1}
            format={money}
            disabled={!isHost}
            onChange={(v) => setSetting({ bidIncrement: v })}
          />
        </div>

        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          <Toggle
            label={d.settings.allowAuctions}
            value={s.allowAuctions}
            disabled={!isHost}
            onChange={(v) => setSetting({ allowAuctions: v })}
          />
          <Toggle
            label={d.settings.x2RentOnFullSet}
            value={s.x2RentOnFullSet}
            disabled={!isHost}
            onChange={(v) => setSetting({ x2RentOnFullSet: v, doubleRentOnFullSet: v })}
          />
          <Toggle
            label={d.settings.vacationCash}
            value={s.vacationCash}
            disabled={!isHost}
            onChange={(v) => setSetting({ vacationCash: v })}
          />
          <Toggle
            label={d.settings.mortgageEnabled}
            value={s.mortgageEnabled}
            disabled={!isHost}
            onChange={(v) => setSetting({ mortgageEnabled: v })}
          />
          <Toggle
            label={d.settings.evenBuild}
            value={s.evenBuild}
            disabled={!isHost}
            onChange={(v) => setSetting({ evenBuild: v })}
          />
          <Toggle
            label={d.settings.randomizeOrder}
            value={s.randomizeOrder}
            disabled={!isHost}
            onChange={(v) => setSetting({ randomizeOrder: v })}
          />
        </div>
      </section>
    </div>
  );
}
