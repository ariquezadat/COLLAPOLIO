'use client';

/**
 * Identidad sin registro: nick + avatar + un id estable en localStorage.
 * El id es lo único que el servidor usa para reconocerte al reconectar.
 */
const KEY = 'collapolio.identity.v1';

export interface Identity {
  playerId: string;
  nick: string;
  avatar: string;
}

export const AVATARS = ['zorro', 'buho', 'grulla', 'lobo', 'nutria', 'liebre', 'ciervo', 'gato'];

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function loadIdentity(): Identity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Identity>;
    if (!parsed.playerId) return null;
    return {
      playerId: parsed.playerId,
      nick: parsed.nick ?? 'Jugador',
      avatar: parsed.avatar ?? AVATARS[0],
    };
  } catch {
    return null;
  }
}

export function saveIdentity(nick: string, avatar: string): Identity {
  const existing = loadIdentity();
  const identity: Identity = {
    playerId: existing?.playerId ?? randomId(),
    nick: nick.trim().slice(0, 16) || 'Jugador',
    avatar,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {
    /* modo privado: seguimos en memoria */
  }
  return identity;
}
