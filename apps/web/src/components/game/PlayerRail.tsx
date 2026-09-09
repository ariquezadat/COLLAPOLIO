'use client';

import type { GameState, Player } from '@collapolio/engine';
import { GROUP_COLORS } from '@collapolio/engine';
import { Avatar } from '../Avatar';
import { useI18n } from '../I18nProvider';
import { Money } from './Money';
import { TurnRing } from './TurnRing';

/**
 * Lista compacta de jugadores para la columna derecha: quien está en turno
 * lleva una barra de color a la izquierda y el fondo resaltado.
 */
export function PlayerRail({
  state,
  you,
  skew,
  onPick,
}: {
  state: GameState;
  you: string | null;
  skew: number;
  onPick?: (player: Player) => void;
}) {
  const { d } = useI18n();
  const currentId = state.order[state.turnIndex];

  return (
    <ul className="space-y-1">
      {state.order.map((id) => {
        const p = state.players.find((x) => x.id === id);
        if (!p) return null;
        const isTurn = p.id === currentId && state.phase !== 'GAME_OVER';
        return (
          <li key={p.id}>
            <button
              type="button"
              disabled={!onPick || p.id === you || p.bankrupt}
              onClick={() => onPick?.(p)}
              className={`relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition
                ${isTurn ? 'bg-brand/15' : 'hover:bg-raised/60'}
                ${p.bankrupt ? 'opacity-40' : ''}
                ${onPick && p.id !== you && !p.bankrupt ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {isTurn && (
                <span
                  className="absolute inset-y-1.5 left-0 w-[3px] rounded-full"
                  style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }}
                />
              )}
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border"
                style={{ borderColor: p.color, background: `${p.color}22` }}
              >
                <Avatar avatar={p.avatar} color={p.color} size={18} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold">{p.nick}</span>
                  {p.id === you && <span className="text-[10px] text-brand">({d.lobby.you})</span>}
                  {p.isBot && <span className="text-[10px] text-muted">{d.game.bot}</span>}
                  {p.inJail && <span title={d.game.inJail}>🔒</span>}
                  {!p.connected && !p.isBot && <span title={d.game.disconnected}>⚠</span>}
                </span>
                {p.properties.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-[2px]">
                    {p.properties.map((i) => {
                      const t = state.board[i];
                      return (
                        <span
                          key={i}
                          className="h-1.5 w-3 rounded-[2px]"
                          style={{
                            background: t.group ? GROUP_COLORS[t.group] : '#4a5570',
                            opacity: t.mortgaged ? 0.3 : 1,
                          }}
                        />
                      );
                    })}
                  </span>
                )}
              </span>

              {isTurn && state.settings.turnTimer > 0 && (
                <TurnRing
                  deadline={state.turnDeadline}
                  total={state.settings.turnTimer}
                  skew={skew}
                  size={26}
                />
              )}
              <Money value={p.money} className="shrink-0 text-sm font-bold" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
