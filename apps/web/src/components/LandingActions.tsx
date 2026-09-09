'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { emit } from '@/lib/socket';
import { loadIdentity, type Identity } from '@/lib/identity';
import { useI18n } from './I18nProvider';
import { NickGate } from './NickGate';

type Intent = 'quick' | 'create' | null;

export function LandingActions() {
  const { d, locale } = useI18n();
  const router = useRouter();
  const [gate, setGate] = useState<Intent>(null);
  const [busy, setBusy] = useState<Intent>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(intent: Exclude<Intent, null>, identity: Identity) {
    setBusy(intent);
    setError(null);
    const res =
      intent === 'quick'
        ? await emit('quick_play', { playerId: identity.playerId })
        : await emit('create_room', {
            playerId: identity.playerId,
            name: `${identity.nick}`,
            isPrivate: true,
          });
    setBusy(null);
    if (res.ok && res.code) router.push(`/${locale}/sala?c=${res.code}`);
    else setError((d.errors as Record<string, string>)[res.error ?? ''] ?? d.errors.generic);
  }

  function start(intent: Exclude<Intent, null>) {
    const identity = loadIdentity();
    if (!identity) return setGate(intent);
    void go(intent, identity);
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <button className="btn-primary py-4 text-base" disabled={busy !== null} onClick={() => start('quick')}>
          {busy === 'quick' ? '…' : d.nav.play}
        </button>
        <button className="btn-ghost py-4 text-base" onClick={() => router.push(`/${locale}/salas`)}>
          {d.nav.rooms}
        </button>
        <button className="btn-ghost py-4 text-base" disabled={busy !== null} onClick={() => start('create')}>
          {busy === 'create' ? '…' : d.nav.create}
        </button>
        {error && <p className="text-center text-sm text-danger">{error}</p>}
      </div>

      <NickGate
        open={gate !== null}
        onClose={() => setGate(null)}
        onReady={(identity) => {
          const intent = gate;
          setGate(null);
          if (intent) void go(intent, identity);
        }}
      />
    </>
  );
}
