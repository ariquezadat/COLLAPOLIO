'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchRooms, type RoomSummary } from '@/lib/socket';
import { loadIdentity } from '@/lib/identity';
import { money } from '@/lib/format';
import { useI18n } from './I18nProvider';
import { NickGate } from './NickGate';

type Filter = 'all' | 'space' | 'noBots' | 'lobby' | 'playing';

export function RoomBrowser() {
  const { d, locale } = useI18n();
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [filters, setFilters] = useState<Set<Filter>>(new Set());
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => setRooms(await fetchRooms()), []);

  useEffect(() => {
    void load();
    const timer = setInterval(load, 6000);
    return () => clearInterval(timer);
  }, [load]);

  function toggle(f: Filter) {
    const next = new Set(filters);
    if (next.has(f)) next.delete(f);
    else next.add(f);
    if (f === 'lobby') next.delete('playing');
    if (f === 'playing') next.delete('lobby');
    setFilters(next);
  }

  const visible = (rooms ?? []).filter((r) => {
    if (filters.has('space') && !r.hasSpace) return false;
    if (filters.has('noBots') && r.hasBots) return false;
    if (filters.has('lobby') && !r.inLobby) return false;
    if (filters.has('playing') && r.inLobby) return false;
    return true;
  });

  function join(code: string) {
    if (!loadIdentity()) return setPending(code);
    router.push(`/${locale}/sala?c=${code}`);
  }

  const chips: [Filter, string][] = [
    ['space', d.rooms.filters.space],
    ['noBots', d.rooms.filters.noBots],
    ['lobby', d.rooms.filters.lobby],
    ['playing', d.rooms.filters.playing],
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {chips.map(([key, label]) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`chip transition ${
              filters.has(key) ? 'border-brand/60 bg-brand/20 text-fg' : 'text-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        ))}
        <button onClick={() => void load()} className="chip ml-auto text-muted hover:text-fg">
          {d.rooms.refresh}
        </button>
      </div>

      {rooms === null && <p className="text-muted">{d.game.connect}</p>}
      {rooms !== null && visible.length === 0 && (
        <div className="surface p-10 text-center text-muted">{d.rooms.empty}</div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {visible.map((r) => (
          <li key={r.code} className="surface flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.name}</p>
                <p className="num text-xs uppercase tracking-widest text-muted">{r.code}</p>
              </div>
              <span
                className={`chip shrink-0 ${
                  r.inLobby ? 'border-mint/40 text-mint' : 'border-warn/40 text-warn'
                }`}
              >
                {r.inLobby ? d.rooms.inLobby : d.rooms.inGame}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs text-muted">
              <span className="chip">{money(r.settings.startingCash)}</span>
              <span className="chip">
                {r.settings.turnTimer > 0
                  ? `${r.settings.turnTimer}${d.settings.seconds}`
                  : d.settings.noLimit}
              </span>
              {r.settings.allowAuctions && <span className="chip">{d.settings.allowAuctions}</span>}
              {r.settings.x2RentOnFullSet && <span className="chip">x2</span>}
              {r.hasBots && <span className="chip">bots</span>}
            </div>

            <div className="mt-auto flex items-center justify-between gap-3">
              <span className="num text-sm text-muted">
                <strong className="text-fg">{r.players}</strong>/{r.maxPlayers} {d.rooms.players}
              </span>
              <button
                className={r.hasSpace ? 'btn-primary' : 'btn-ghost'}
                onClick={() => join(r.code)}
              >
                {r.hasSpace ? d.rooms.join : d.rooms.watch}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <NickGate
        open={pending !== null}
        onClose={() => setPending(null)}
        onReady={() => {
          const code = pending;
          setPending(null);
          if (code) router.push(`/${locale}/sala?c=${code}`);
        }}
      />
    </>
  );
}
