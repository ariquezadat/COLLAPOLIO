'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { GameState } from '@collapolio/engine';
import { TileView } from './Tile';
import { Dice3D } from './Dice3D';
import { Logo } from '../Iso';
import { useI18n } from '../I18nProvider';

export function Board({
  state,
  renderPos,
  dice,
  onTileClick,
  highlight,
}: {
  state: GameState;
  renderPos: Record<string, number>;
  dice: { d1: number; d2: number; key: number } | null;
  onTileClick?: (index: number) => void;
  highlight?: number | null;
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

        {/* Centro: marca, dados y jugador en turno */}
        <div className="pointer-events-none col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col items-center justify-center gap-5">
          <div className="flex items-center gap-2 opacity-40">
            <Logo size={26} />
            <span className="text-lg font-extrabold tracking-tight">{d.brand}</span>
          </div>

          <div className="flex items-center gap-3">
            <AnimatePresence mode="popLayout">
              {dice ? (
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
              ) : (
                <div className="h-[52px]" />
              )}
            </AnimatePresence>
          </div>

          {current && (
            <div className="flex items-center gap-2 rounded-full border border-line/10 bg-raised/70 px-3 py-1.5 backdrop-blur">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: current.color, boxShadow: `0 0 10px ${current.color}` }}
              />
              <span className="text-xs font-semibold">{current.nick}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
