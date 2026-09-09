'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState, LogEntry } from '@collapolio/engine';
import { fill } from '@/i18n';
import type { ChatMessage } from '@/lib/store';
import { useI18n } from '../I18nProvider';

/** Traduce una entrada del registro resolviendo jugador y casilla. */
export function formatLog(entry: LogEntry, state: GameState, d: any): string {
  const template = (d.log as Record<string, string>)[entry.key.replace(/^log\./, '')];
  if (!template) return entry.key;
  const params: Record<string, string | number> = { ...(entry.params ?? {}) };
  const player = state.players.find((p) => p.id === entry.playerId);
  if (player) {
    params.p = player.nick;
    params.nick = params.nick ?? player.nick;
  }
  if (typeof params.tile === 'string') {
    params.tile = (d.tile as Record<string, string>)[params.tile] ?? params.tile;
  }
  return fill(template, params);
}

export function SidePanel({
  state,
  chat,
  onSend,
}: {
  state: GameState;
  chat: ChatMessage[];
  onSend: (text: string) => void;
}) {
  const { d } = useI18n();
  const [tab, setTab] = useState<'log' | 'chat'>('log');
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (tab === 'log') logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [state.log.length, tab]);

  useEffect(() => {
    if (tab === 'chat') {
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
      setUnread(0);
    } else if (chat.length) {
      setUnread((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.length, tab]);

  const colorOf = (id?: string) => state.players.find((p) => p.id === id)?.color ?? '#8a93ab';

  return (
    <section className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 border-b border-line/[0.07]">
        {(['log', 'chat'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition ${
              tab === key ? 'text-fg' : 'text-muted hover:text-fg/80'
            }`}
          >
            {key === 'log' ? d.game.log : d.game.chat}
            {key === 'chat' && unread > 0 && tab !== 'chat' && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand align-middle" />
            )}
            {tab === key && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-brand" />}
          </button>
        ))}
      </div>

      {tab === 'log' ? (
        <div ref={logRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
          {state.log.map((entry) => (
            <p key={entry.id} className="flex gap-2 text-[12px] leading-snug text-muted">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: colorOf(entry.playerId) }}
              />
              <span className="text-pretty">{formatLog(entry, state, d)}</span>
            </p>
          ))}
        </div>
      ) : (
        <>
          <div ref={chatRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {chat.map((m) => (
              <p key={m.id} className="text-[12px] leading-snug">
                <span className="font-bold" style={{ color: colorOf(m.playerId) }}>
                  {m.nick}
                </span>
                <span className="text-muted"> · </span>
                <span className="text-pretty text-fg/85">{m.text}</span>
              </p>
            ))}
          </div>
          <form
            className="flex shrink-0 gap-2 border-t border-line/[0.07] p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              const text = draft.trim();
              if (!text) return;
              onSend(text);
              setDraft('');
            }}
          >
            <input
              className="field py-1.5 text-[13px]"
              placeholder={d.game.chatPlaceholder}
              value={draft}
              maxLength={240}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn-ghost px-3 py-1.5" type="submit" aria-label="enviar">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 3 18 9-18 9 4-9z" />
              </svg>
            </button>
          </form>
        </>
      )}
    </section>
  );
}
