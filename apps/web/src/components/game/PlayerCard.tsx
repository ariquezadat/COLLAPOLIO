'use client';

import type { GameState, Player } from '@collapolio/engine';
import { GROUP_COLORS } from '@collapolio/engine';
import { Avatar } from '../Avatar';
import { useI18n } from '../I18nProvider';
import { Money } from './Money';
import { TurnRing } from './TurnRing';

export function PlayerCard({
  player,
  state,
  isTurn,
  isYou,
  skew,
  onTrade,
}: {
  player: Player;
  state: GameState;
  isTurn: boolean;
  isYou: boolean;
  skew: number;
  onTrade?: () => void;
}) {
  const { d } = useI18n();
  const props = player.properties.map((i) => state.board[i]);

  return (
    <article
      className={`surface relative p-3 transition ${
        isTurn ? 'border-brand/60 ring-1 ring-brand/50' : ''
      } ${player.bankrupt ? 'opacity-45' : ''}`}
      style={isTurn ? { boxShadow: `0 0 30px -12px ${player.color}` } : undefined}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
          style={{ borderColor: player.color, background: `${player.color}22` }}
        >
          <Avatar avatar={player.avatar} color={player.color} size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold">{player.nick}</p>
            {isYou && <span className="text-[10px] font-semibold text-brand">({d.lobby.you})</span>}
            {player.isBot && <span className="chip px-1.5 py-0 text-[9px]">{d.game.bot}</span>}
          </div>
          <p className="text-[11px] text-muted">
            <span className="num">{d.game.net}: </span>
            <span className="num font-semibold text-fg/80">
              ${(player.netWorth ?? player.money).toLocaleString('en-US')}
            </span>
          </p>
        </div>

        {isTurn && state.settings.turnTimer > 0 && (
          <TurnRing deadline={state.turnDeadline} total={state.settings.turnTimer} skew={skew} />
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <Money value={player.money} className="text-lg font-extrabold" />
        <div className="flex flex-wrap items-center gap-1">
          {player.inJail && <span className="chip border-warn/40 px-1.5 py-0 text-[9px] text-warn">{d.game.inJail}</span>}
          {player.getOutCards > 0 && (
            <span className="chip border-mint/40 px-1.5 py-0 text-[9px] text-mint">
              {player.getOutCards}×
            </span>
          )}
          {!player.connected && !player.isBot && (
            <span className="chip border-danger/40 px-1.5 py-0 text-[9px] text-danger">
              {d.game.disconnected}
            </span>
          )}
          {player.bankrupt && (
            <span className="chip border-danger/40 px-1.5 py-0 text-[9px] text-danger">
              {d.game.bankrupt}
            </span>
          )}
        </div>
      </div>

      {props.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-[3px]">
          {props.map((t) => (
            <span
              key={t.index}
              title={(d.tile as Record<string, string>)[t.name] ?? t.name}
              className="h-2.5 w-4 rounded-[3px]"
              style={{
                background: t.group ? GROUP_COLORS[t.group] : '#4a5570',
                opacity: t.mortgaged ? 0.3 : 1,
                outline: (t.houses ?? 0) > 0 ? '1px solid rgb(52 224 180)' : 'none',
              }}
            />
          ))}
        </div>
      )}

      {onTrade && !player.bankrupt && !isYou && (
        <button
          onClick={onTrade}
          className="mt-2.5 w-full rounded-lg border border-line/10 bg-ink/40 py-1 text-[11px] font-semibold text-muted transition hover:text-fg"
        >
          {d.game.trade}
        </button>
      )}
    </article>
  );
}
