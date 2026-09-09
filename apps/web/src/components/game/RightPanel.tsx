'use client';

import { useState } from 'react';
import type { GameState, Player, Trade } from '@collapolio/engine';
import { GROUP_COLORS } from '@collapolio/engine';
import { money } from '@/lib/format';
import { useI18n } from '../I18nProvider';
import { PlayerRail } from './PlayerRail';
import { Modal } from './Modal';

/** Ficha de una propiedad en la lista "Mis propiedades" */
function PropertyRow({
  state,
  index,
  onClick,
}: {
  state: GameState;
  index: number;
  onClick: () => void;
}) {
  const { d } = useI18n();
  const tile = state.board[index];
  const nombre = (d.tile as Record<string, string>)[tile.name] ?? tile.name;
  const casas = tile.houses ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-raised/70 ${
        tile.mortgaged ? 'opacity-50' : ''
      }`}
    >
      <span
        className="h-4 w-4 shrink-0 rounded"
        style={{ background: tile.group ? GROUP_COLORS[tile.group] : '#4a5570' }}
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{nombre}</span>
      {casas > 0 && (
        <span className="shrink-0 text-[10px] font-bold text-mint">
          {casas === 5 ? 'H' : `${casas}🏠`}
        </span>
      )}
      {tile.mortgaged && (
        <span className="shrink-0 text-[9px] font-bold uppercase text-danger">H</span>
      )}
    </button>
  );
}

export function RightPanel({
  state,
  you,
  skew,
  onManage,
  onTradeWith,
  onRespondTrade,
  onBankrupt,
}: {
  state: GameState;
  you: string | null;
  skew: number;
  onManage: () => void;
  onTradeWith: (playerId: string | null) => void;
  onRespondTrade: (tradeId: string, accept: boolean) => void;
  onBankrupt: () => void;
}) {
  const { d } = useI18n();
  const [confirmar, setConfirmar] = useState(false);
  const me = state.players.find((p) => p.id === you);
  const jugando = state.phase !== 'LOBBY' && state.phase !== 'GAME_OVER';

  const misTratos: Trade[] = state.trades.filter(
    (t) => t.status === 'PENDING' && (t.from.playerId === you || t.to.playerId === you),
  );

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <section className="surface p-2">
        <PlayerRail
          state={state}
          you={you}
          skew={skew}
          onPick={me && jugando ? (p: Player) => onTradeWith(p.id) : undefined}
        />
      </section>

      {me && !me.bankrupt && jugando && (
        <button
          className="btn w-full border border-danger/40 bg-danger/15 py-2 text-sm font-bold text-danger transition hover:bg-danger/25"
          onClick={() => setConfirmar(true)}
        >
          {d.game.declareBankruptcy}
        </button>
      )}

      {me && jugando && (
        <section className="surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
              {d.game.trade}
            </h3>
            <button className="btn-primary px-3 py-1 text-xs" onClick={() => onTradeWith(null)}>
              + {d.game.propose}
            </button>
          </div>

          {misTratos.length === 0 ? (
            <p className="text-[12px] text-muted">{d.game.noTrades}</p>
          ) : (
            <ul className="space-y-1.5">
              {misTratos.map((t) => {
                const otro = state.players.find(
                  (p) => p.id === (t.from.playerId === you ? t.to.playerId : t.from.playerId),
                );
                const recibida = t.to.playerId === you;
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-line/10 bg-ink/40 px-2 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-[12px]">
                      {recibida ? '←' : '→'} {otro?.nick ?? '—'}
                    </span>
                    {recibida && (
                      <>
                        <button
                          className="rounded px-1.5 py-0.5 text-[11px] font-bold text-danger hover:bg-danger/15"
                          onClick={() => onRespondTrade(t.id, false)}
                        >
                          ✕
                        </button>
                        <button
                          className="rounded px-1.5 py-0.5 text-[11px] font-bold text-mint hover:bg-mint/15"
                          onClick={() => onRespondTrade(t.id, true)}
                        >
                          ✓
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {me && me.properties.length > 0 && (
        <section className="surface flex min-h-0 flex-1 flex-col p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
            {d.game.myProperties} ({me.properties.length})
          </h3>
          <p className="mb-2 text-[11px] leading-snug text-muted">{d.game.clickToManage}</p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {me.properties.map((i) => (
              <PropertyRow key={i} state={state} index={i} onClick={onManage} />
            ))}
          </div>
          <p className="num mt-2 border-t border-line/10 pt-2 text-[12px] text-muted">
            {d.game.net}: <span className="font-bold text-fg">{money(me.netWorth ?? me.money)}</span>
          </p>
        </section>
      )}

      <Modal
        open={confirmar}
        onClose={() => setConfirmar(false)}
        title={d.game.declareBankruptcy}
      >
        <p className="text-sm text-muted">{d.game.bankruptWarning}</p>
        <div className="mt-5 flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => setConfirmar(false)}>
            {d.game.cancel}
          </button>
          <button
            className="btn-danger flex-1"
            onClick={() => {
              setConfirmar(false);
              onBankrupt();
            }}
          >
            {d.game.confirmBankrupt}
          </button>
        </div>
      </Modal>
    </div>
  );
}
