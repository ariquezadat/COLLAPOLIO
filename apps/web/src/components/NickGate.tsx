'use client';

import { useEffect, useState } from 'react';
import { AVATARS, loadIdentity, saveIdentity, type Identity } from '@/lib/identity';
import { useI18n } from './I18nProvider';
import { Avatar } from './Avatar';

/**
 * Sin registro: pide nick y ficha la primera vez y lo guarda en localStorage.
 * Devuelve la identidad por callback para que la página siga su flujo.
 */
export function NickGate({
  open,
  onReady,
  onClose,
}: {
  open: boolean;
  onReady: (id: Identity) => void;
  onClose?: () => void;
}) {
  const { d } = useI18n();
  const [nick, setNick] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);

  useEffect(() => {
    const existing = loadIdentity();
    if (existing) {
      setNick(existing.nick);
      setAvatar(existing.avatar);
    }
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm">
      <div className="surface-raised w-full max-w-md p-6 shadow-lift">
        <h2 className="text-xl font-bold">{d.nick.title}</h2>
        <form
          className="mt-5 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onReady(saveIdentity(nick, avatar));
          }}
        >
          <input
            className="field"
            placeholder={d.nick.placeholder}
            value={nick}
            maxLength={16}
            autoFocus
            onChange={(e) => setNick(e.target.value)}
          />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {d.nick.avatar}
            </p>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-label={a}
                  aria-pressed={avatar === a}
                  onClick={() => setAvatar(a)}
                  className={`grid h-11 w-11 place-items-center rounded-xl border transition ${
                    avatar === a ? 'border-brand bg-brand/15' : 'border-line/10 bg-ink/50'
                  }`}
                >
                  <Avatar avatar={a} color="#7c6bff" size={26} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {onClose && (
              <button type="button" className="btn-ghost flex-1" onClick={onClose}>
                {d.game.cancel}
              </button>
            )}
            <button type="submit" className="btn-primary flex-1">
              {d.nick.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
