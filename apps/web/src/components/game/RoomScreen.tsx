'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Trade } from '@collapolio/engine';
import { loadIdentity, type Identity } from '@/lib/identity';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sound';
import { useGame, usePendingTrades } from '@/lib/store';
import { useI18n } from '../I18nProvider';
import { NickGate } from '../NickGate';
import { Logo } from '../Iso';
import { Board } from '../board/Board';
import { Lobby } from './Lobby';
import { RightPanel } from './RightPanel';
import { ShareBox } from './ShareBox';
import { SidePanel } from './SidePanel';
import { ActionBar } from './ActionBar';
import { PurchaseModal } from './PurchaseModal';
import { CardModal } from './CardModal';
import { AuctionModal } from './AuctionModal';
import { ManageModal } from './ManageModal';
import { TradeModal, TradeInbox } from './TradeModal';
import { DebtModal, GameOverModal } from './EndModals';

type Sheet = 'players' | 'log' | null;

export function RoomScreen({ code, locale }: { code: string; locale: string }) {
  const { d } = useI18n();
  const { status, state, chat, you, legal, renderPos, dice, toast, clockSkew, connect, send } =
    useGame();
  const pendingTrades = usePendingTrades();

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradePartner, setTradePartner] = useState<string | null>(null);
  const [counterOf, setCounterOf] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [sound, setSound] = useState(true);

  useEffect(() => {
    setIdentity(loadIdentity());
    setSound(isSoundEnabled());
  }, []);

  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    void connect(code, identity).then((err) => {
      if (!cancelled && err) setJoinError(err);
    });
    return () => {
      cancelled = true;
    };
  }, [identity, code, connect]);

  const act = (event: string, payload?: unknown) => void send(event, payload);

  if (!identity) {
    return (
      <NickGate
        open
        onReady={(id) => setIdentity(id)}
      />
    );
  }

  if (joinError) {
    const message = (d.errors as Record<string, string>)[joinError] ?? d.errors.generic;
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="surface max-w-sm p-8">
          <p className="mb-5 text-lg font-semibold">{message}</p>
          <Link className="btn-primary" href={`/${locale}/salas`}>
            {d.nav.rooms}
          </Link>
        </div>
      </main>
    );
  }

  if (!state || status === 'connecting') {
    return (
      <main className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <span className="animate-floaty">
            <Logo size={44} />
          </span>
          <p className="text-sm">{status === 'connecting' ? d.game.reconnecting : d.game.connect}</p>
        </div>
      </main>
    );
  }

  const header = (
    <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
      <Link href={`/${locale}`} className="flex items-center gap-2">
        <Logo size={22} />
        <span className="text-sm font-extrabold tracking-tight">{d.brand}</span>
      </Link>
      <div className="flex items-center gap-2">
        <span className="num chip text-[11px] tracking-[0.2em]">{code}</span>
        <button
          className="chip text-muted transition hover:text-fg"
          aria-label="sonido"
          onClick={() => {
            const next = !sound;
            setSound(next);
            setSoundEnabled(next);
          }}
        >
          {sound ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );

  if (state.phase === 'LOBBY') {
    return (
      <main className="flex min-h-dvh flex-col">
        {header}
        <div className="flex-1 px-4 pb-8">
          <Lobby state={state} you={you} code={code} onAction={act} />
        </div>
        {toast && <Toast text={(d.errors as Record<string, string>)[toast.text] ?? toast.text} kind={toast.kind} />}
      </main>
    );
  }

  const abrirTrade = (partnerId: string | null) => {
    setTradePartner(partnerId);
    setCounterOf(null);
    setTradeOpen(true);
  };

  const panelDerecho = (
    <RightPanel
      state={state}
      you={you}
      skew={clockSkew}
      onManage={() => setManageOpen(true)}
      onTradeWith={abrirTrade}
      onRespondTrade={(tradeId, accept) => act('respond_trade', { tradeId, accept })}
      onBankrupt={() => act('declare_bankruptcy')}
    />
  );

  const panelIzquierdo = (
    <div className="flex min-h-0 flex-col gap-3">
      <ShareBox code={code} />
      <SidePanel state={state} chat={chat} onSend={(text) => act('chat_message', { text })} />
    </div>
  );

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      {header}

      <div className="grid min-h-0 flex-1 gap-3 px-3 pb-3 lg:grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(250px,310px)]">
        {/* Izquierda: invitación y chat */}
        <aside className="hidden min-h-0 lg:flex lg:flex-col">{panelIzquierdo}</aside>

        {/* Centro: tablero + barra de acciones */}
        <section className="flex min-h-0 flex-col items-center gap-3">
          <div className="flex min-h-0 w-full flex-1 items-center justify-center">
            <div className="w-full max-w-[min(100%,calc(100dvh-190px))]">
              <Board state={state} renderPos={renderPos} dice={dice} skew={clockSkew} />
            </div>
          </div>
          <div className="w-full max-w-2xl">
            <ActionBar
              state={state}
              you={you}
              legal={legal}
              onAction={act}
              onManage={() => setManageOpen(true)}
              onTrade={() => abrirTrade(null)}
            />
          </div>
        </section>

        {/* Derecha: jugadores, bancarrota, intercambios y propiedades */}
        <aside className="hidden min-h-0 overflow-y-auto lg:block">{panelDerecho}</aside>
      </div>

      {/* Móvil: hojas inferiores */}
      <div className="flex shrink-0 gap-2 border-t border-line/[0.07] p-2 lg:hidden">
        <button className="btn-ghost flex-1 py-2 text-xs" onClick={() => setSheet('players')}>
          {d.lobby.players}
        </button>
        <button className="btn-ghost flex-1 py-2 text-xs" onClick={() => setSheet('log')}>
          {d.game.log} / {d.game.chat}
        </button>
      </div>

      {sheet && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-ink/70 backdrop-blur-sm lg:hidden"
          onClick={(e) => e.target === e.currentTarget && setSheet(null)}
        >
          <div className="surface-raised max-h-[80dvh] w-full overflow-y-auto rounded-b-none p-4">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line/20" />
            {sheet === 'players' ? (
              panelDerecho
            ) : (
              <div className="flex h-[60dvh] flex-col gap-3">
                <ShareBox code={code} />
                <SidePanel
                  state={state}
                  chat={chat}
                  onSend={(text) => act('chat_message', { text })}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modales */}
      <PurchaseModal
        state={state}
        you={you}
        onBuy={() => act('buy_property')}
        onDecline={() => act('decline_purchase')}
      />
      <CardModal state={state} you={you} onAck={() => act('ack_card')} />
      {state.phase === 'AUCTION' && (
        <AuctionModal
          state={state}
          you={you}
          skew={clockSkew}
          onBid={(amount) => act('bid', { amount })}
          onPass={() => act('pass_bid')}
        />
      )}
      <DebtModal
        state={state}
        you={you}
        onManage={() => setManageOpen(true)}
        onBankrupt={() => act('declare_bankruptcy')}
      />
      <ManageModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        state={state}
        you={you}
        onAction={act}
      />
      <TradeModal
        open={tradeOpen}
        onClose={() => setTradeOpen(false)}
        state={state}
        you={you}
        initialPartner={tradePartner}
        onPropose={(to, offer, request) => {
          act('propose_trade', { to, offer, request, counterOf });
          setTradeOpen(false);
          setCounterOf(null);
        }}
      />
      {pendingTrades.length > 0 && !tradeOpen && (
        <TradeInbox
          trades={pendingTrades}
          state={state}
          onRespond={(tradeId, accept) => act('respond_trade', { tradeId, accept })}
          onCounter={(trade: Trade) => {
            setTradePartner(trade.from.playerId);
            setCounterOf(trade.id);
            setTradeOpen(true);
          }}
        />
      )}
      <GameOverModal state={state} locale={locale} />

      {toast && <Toast text={(d.errors as Record<string, string>)[toast.text] ?? toast.text} kind={toast.kind} />}
    </main>
  );
}

function Toast({ text, kind }: { text: string; kind: 'info' | 'error' | 'good' }) {
  return (
    <div
      className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lift backdrop-blur ${
        kind === 'error'
          ? 'border-danger/40 bg-danger/15 text-danger'
          : kind === 'good'
            ? 'border-mint/40 bg-mint/15 text-mint'
            : 'border-line/10 bg-raised/90'
      }`}
    >
      {text}
    </div>
  );
}
