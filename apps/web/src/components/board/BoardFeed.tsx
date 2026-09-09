'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { GameState } from '@collapolio/engine';
import { useI18n } from '../I18nProvider';
import { formatLog } from '../game/SidePanel';

/**
 * Bitácora en vivo dentro del tablero: las últimas jugadas, desvaneciéndose
 * hacia arriba. Deja ver de un vistazo qué acaba de pasar sin mirar el panel.
 */
export function BoardFeed({ state }: { state: GameState }) {
  const { d } = useI18n();
  const entradas = state.log.slice(-7);
  const total = entradas.length;

  return (
    <div className="pointer-events-none flex w-full flex-col items-center gap-0.5 px-4">
      <AnimatePresence initial={false}>
        {entradas.map((entrada, i) => {
          // La más reciente abajo y opaca; las viejas se difuminan
          const frescura = total > 1 ? i / (total - 1) : 1;
          return (
            <motion.p
              key={entrada.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.15 + frescura * 0.75, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="max-w-full truncate text-center text-[11px] leading-tight text-fg/90"
            >
              {formatLog(entrada, state, d)}
            </motion.p>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
