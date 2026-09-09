'use client';

import { create } from 'zustand';
import type { GameState, LogEntry, Trade } from '@collapolio/engine';
import { legalActions } from '@collapolio/engine';
import { getSocket, emit } from './socket';
import { play } from './sound';

export interface ChatMessage {
  id: number;
  playerId: string;
  nick: string;
  text: string;
  at: number;
}

interface StatePatch {
  root: Record<string, unknown>;
  players: [number, unknown][];
  board: [number, unknown][];
}

export type Toast = { id: number; text: string; kind: 'info' | 'error' | 'good' } | null;

interface DiceRoll {
  d1: number;
  d2: number;
  key: number;
}

interface Store {
  status: 'idle' | 'connecting' | 'ready' | 'error';
  code: string | null;
  you: string | null;
  state: GameState | null;
  chat: ChatMessage[];
  legal: string[];
  /** Posición visual de cada ficha; avanza casilla por casilla */
  renderPos: Record<string, number>;
  dice: DiceRoll | null;
  toast: Toast;
  /** Diferencia entre el reloj del servidor y el del cliente */
  clockSkew: number;
  soundOn: boolean;

  connect: (code: string, identity: { playerId: string; nick: string; avatar: string }) => Promise<string | null>;
  disconnect: () => void;
  send: (event: string, payload?: unknown) => Promise<void>;
  showToast: (text: string, kind?: 'info' | 'error' | 'good') => void;
  setSound: (v: boolean) => void;
}

let bound = false;
let moveTimer: ReturnType<typeof setTimeout> | null = null;

function recomputeLegal(state: GameState | null, you: string | null): string[] {
  if (!state || !you) return [];
  try {
    return legalActions(state, you);
  } catch {
    return [];
  }
}

export const useGame = create<Store>((set, get) => ({
  status: 'idle',
  code: null,
  you: null,
  state: null,
  chat: [],
  legal: [],
  renderPos: {},
  dice: null,
  toast: null,
  clockSkew: 0,
  soundOn: true,

  setSound: (v) => set({ soundOn: v }),

  showToast: (text, kind = 'info') => {
    const id = Date.now();
    set({ toast: { id, text, kind } });
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 3200);
  },

  async connect(code, identity) {
    set({ status: 'connecting', code });
    const socket = getSocket();

    if (!bound) {
      bound = true;

      socket.on('room_state', (payload: any) => {
        const positions: Record<string, number> = {};
        for (const p of payload.state.players) positions[p.id] = p.position;
        set({
          state: payload.state,
          chat: payload.chat ?? [],
          you: payload.you ?? null,
          legal: recomputeLegal(payload.state, payload.you ?? null),
          renderPos: positions,
          status: 'ready',
          clockSkew: (payload.serverTime ?? Date.now()) - Date.now(),
        });
      });

      socket.on('state_patch', (patch: StatePatch) => {
        const prev = get().state;
        if (!prev) return;
        const next: GameState = { ...prev };
        Object.assign(next, patch.root);
        if (patch.players.length) {
          next.players = [...prev.players];
          for (const [i, p] of patch.players) next.players[i] = p as never;
        }
        if (patch.board.length) {
          next.board = [...prev.board];
          for (const [i, t] of patch.board) next.board[i] = t as never;
        }
        set({ state: next, legal: recomputeLegal(next, get().you) });
      });

      socket.on('log_entry', (entry: LogEntry) => {
        const state = get().state;
        if (!state) return;
        // El snapshot ya puede traer la entrada: se ignora si el id ya está
        if (state.log.some((e) => e.id === entry.id)) return;
        const log = [...state.log, entry].slice(-300);
        set({ state: { ...state, log } });
      });

      socket.on('chat_message', (msg: ChatMessage) => {
        set({ chat: [...get().chat, msg].slice(-120) });
      });

      socket.on('dice_rolled', ({ d1, d2 }: { d1: number; d2: number }) => {
        play('roll');
        set({ dice: { d1, d2, key: Date.now() } });
      });

      socket.on('player_moved', ({ playerId, path, teleport }: any) => {
        if (moveTimer) clearTimeout(moveTimer);
        if (teleport || path.length <= 1) {
          set({ renderPos: { ...get().renderPos, [playerId]: path[path.length - 1] } });
          return;
        }
        let step = 0;
        const advance = () => {
          set({ renderPos: { ...get().renderPos, [playerId]: path[step] } });
          step += 1;
          if (step < path.length) moveTimer = setTimeout(advance, 190);
        };
        advance();
      });

      socket.on('auction_started', () => play('turn'));
      socket.on('auction_bid', () => play('bid'));
      socket.on('auction_won', () => play('buy'));
      socket.on('player_bankrupt', () => play('bankrupt'));
      socket.on('trade_proposed', () => play('turn'));

      socket.on('money_changed', ({ playerId, delta, reason }: any) => {
        if (playerId !== get().you) return;
        if (reason === 'buy' || reason === 'auction') play('buy');
        else if (reason === 'RENT' || reason === 'rent') play('rent');
        else if (reason === 'build') play('build');
      });

      socket.on('disconnect', () => set({ status: 'connecting' }));
      socket.on('connect', () => {
        // Reconexión transparente: se pide el snapshot completo otra vez
        const { code: current } = get();
        if (current) void emit('resync');
      });
    }

    const res = await emit('join_room', {
      code,
      playerId: identity.playerId,
      nick: identity.nick,
      avatar: identity.avatar,
    });
    if (!res.ok) {
      set({ status: 'error' });
      return res.error ?? 'generic';
    }
    // Quién eres lo decide el servidor en `room_state`: si la partida ya
    // empezó entras como espectador y `you` queda en null.
    return null;
  },

  disconnect() {
    void emit('leave_room');
    set({ status: 'idle', code: null, state: null, chat: [], you: null, renderPos: {} });
  },

  async send(event, payload = {}) {
    const res = await emit(event, payload);
    if (!res.ok && res.error) {
      play('error');
      get().showToast(res.error, 'error');
    }
  },
}));

/** Turno actual, listo para la UI */
export function useCurrentPlayer() {
  const state = useGame((s) => s.state);
  if (!state) return null;
  const id = state.order[state.turnIndex];
  return state.players.find((p) => p.id === id) ?? null;
}

export function usePendingTrades(): Trade[] {
  const state = useGame((s) => s.state);
  const you = useGame((s) => s.you);
  if (!state || !you) return [];
  return state.trades.filter((t) => t.status === 'PENDING' && t.to.playerId === you);
}
