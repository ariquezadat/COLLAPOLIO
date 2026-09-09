'use client';

import { io, type Socket } from 'socket.io-client';

declare global {
  interface Window {
    __COLLAPOLIO_CONFIG__?: { serverUrl?: string };
  }
}

/**
 * La URL del servidor de partidas se resuelve en runtime desde `/config.js`,
 * no en el build: así se puede repuntar el hosting a otro servidor sin
 * recompilar la web. La variable de entorno queda como respaldo en desarrollo.
 */
export function serverUrl(): string {
  const porEntorno = process.env.NEXT_PUBLIC_SERVER_URL;
  if (typeof window !== 'undefined') {
    // En local siempre se habla con el servidor local: `config.js` lleva la
    // URL de producción, cuyo CORS no acepta localhost.
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return porEntorno ?? 'http://localhost:4000';
    }
    const deConfig = window.__COLLAPOLIO_CONFIG__?.serverUrl;
    if (deConfig) return deConfig;
  }
  return porEntorno ?? 'http://localhost:4000';
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(serverUrl(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 600,
      reconnectionDelayMax: 4000,
      autoConnect: true,
    });
  }
  return socket;
}

export interface Ack {
  ok: boolean;
  code?: string;
  error?: string;
  rooms?: RoomSummary[];
}

export function emit<T = Ack>(event: string, payload: unknown = {}): Promise<T> {
  return new Promise((resolve) => {
    const s = getSocket();
    const timer = setTimeout(() => resolve({ ok: false, error: 'timeout' } as T), 8000);
    s.emit(event, payload, (res: T) => {
      clearTimeout(timer);
      resolve(res ?? ({ ok: false, error: 'no_response' } as T));
    });
  });
}

export interface RoomSummary {
  code: string;
  name: string;
  players: number;
  maxPlayers: number;
  phase: string;
  inLobby: boolean;
  hasBots: boolean;
  hasSpace: boolean;
  settings: {
    startingCash: number;
    turnTimer: number;
    allowAuctions: boolean;
    vacationCash: boolean;
    x2RentOnFullSet: boolean;
  };
  updatedAt: number;
}

export async function fetchRooms(): Promise<RoomSummary[]> {
  try {
    const res = await fetch(`${serverUrl()}/api/rooms`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { rooms: RoomSummary[] };
    return data.rooms ?? [];
  } catch {
    return [];
  }
}
