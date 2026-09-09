'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { GameState } from '@collapolio/engine';
import { TileView } from './Tile';
import { Dice3D } from './Dice3D';
import { BoardFeed } from './BoardFeed';
import { Logo } from '../Iso';
import { useI18n } from '../I18nProvider';
import { TurnRing } from '../game/TurnRing';

export function Board({
  state,
  renderPos,
  dice,
  onTileClick,
  highlight,
  skew = 0,
}: {
  state: GameState;
  renderPos: Record<string, number>;
  dice: { d1: number; d2: number; key: number } | null;
  onTileClick?: (index: number) => void;
  highlight?: number | null;
  skew?: number;
}) {
  const { d } = useI18n();
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const current = state.players.find((p) => p.id === state.order[state.turnIndex]);

  return (
    <div className="relative aspect-square w-full select-none">
      <div className="grid h-full w-full grid-cols-[1.5fr_repeat(9,1fr)_1.5fr] grid-rows-[1.5fr_repeat(9,1fr)_1.5fr] gap-[2px] rounded-2xl border border-line/[0.07] bg-ink/60 p-[2px]">
        {state.board.map((tile) => {
          const here = state.players.filter(
            (p) => !p.bankrupt && (renderPos[p.id] ?? p.position) === tile.index,
          );
          return (
            <TileView
              key={tile.index}
              tile={tile}
              players={here}
              owner={tile.ownerId ? byId.get(tile.ownerId) : undefined}
              highlight={highlight === tile.index}
              onClick={onTileClick ? () => onTileClick(tile.index) : undefined}
            />
          );
        })}

        {/* Centro: reloj, dados, quién juega y la bitácora en vivo */}
        <div className="pointer-events-none col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col items-center justify-center gap-2 overflow-hidden py-2">
          {state.settings.turnTimer > 0 && state.turnDeadline ? (
            <TurnRing
              deadline={state.turnDeadline}
              total={state.settings.turnTimer}
              skew={skew}
              size={42}
            />
          ) : (
            <div className="flex items-center gap-2 opacity-30">
              <Logo size={20} />
              <span className="text-sm font-extrabold tracking-tight">{d.brand}</span>
            </div>
          )}

          <div className="flex min-h-[56px] items-center gap-3">
            <AnimatePresence mode="popLayout">
              {dice && (
                <motion.div
                  key={dice.key}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, y: -18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                >
                  <Dice3D value={dice.d1} spinKey={dice.key} />
                  <Dice3D value={dice.d2} spinKey={dice.key} delay={0.08} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {current && (
            <div className="flex items-center gap-2 rounded-full border border-line/10 bg-raised/70 px-3 py-1 backdrop-blur">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: current.color, boxShadow: `0 0 10px ${current.color}` }}
              />
              <span className="text-[11px] font-semibold">
                {d.game.isPlaying.replace('{nick}', current.nick)}
              </span>
            </div>
          )}

          <BoardFeed state={state} />
        </div>
      </div>
    </div>
  );
}
