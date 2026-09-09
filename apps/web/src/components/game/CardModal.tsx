'use client';

import type { GameState } from '@collapolio/engine';
import { useI18n } from '../I18nProvider';
import { Modal } from './Modal';

export function CardModal({
  state,
  you,
  onAck,
}: {
  state: GameState;
  you: string | null;
  onAck: () => void;
}) {
  const { d } = useI18n();
  const card = state.pendingCard;
  const isMine = state.order[state.turnIndex] === you;
  if (!card) return null;

  const text = (d.card as Record<string, string>)[card.cardId] ?? card.cardId;
  const isChance = card.deck === 'CHANCE';

  return (
    <Modal open={!!card} title={isChance ? d.tile.suerte : d.tile.arca}>
      <div
        className="rounded-2xl border p-6 text-center"
        style={{
          borderColor: isChance ? 'rgb(255 176 61 / .35)' : 'rgb(52 224 180 / .35)',
          background: isChance
            ? 'linear-gradient(160deg, rgb(255 176 61 / .12), transparent)'
            : 'linear-gradient(160deg, rgb(52 224 180 / .12), transparent)',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className={`mx-auto mb-4 h-10 w-10 ${isChance ? 'text-warn' : 'text-mint'}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isChance ? (
            <path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7V14m0 3.5h.01" />
          ) : (
            <path d="M3 8h18v11H3zM3 8l2-4h14l2 4M12 8v11M9 12h6" />
          )}
        </svg>
        <p className="text-balance text-lg font-semibold leading-snug">{text}</p>
      </div>

      {isMine ? (
        <button className="btn-primary mt-4 w-full" onClick={onAck}>
          {d.game.ok}
        </button>
      ) : (
        <p className="mt-4 text-center text-sm text-muted">
          {d.game.waitingFor.replace(
            '{nick}',
            state.players.find((p) => p.id === state.order[state.turnIndex])?.nick ?? '…',
          )}
        </p>
      )}
    </Modal>
  );
}
