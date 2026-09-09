'use client';

import { motion } from 'framer-motion';
import type { GameState } from '@collapolio/engine';
import { useI18n } from '../I18nProvider';

export function ActionBar({
  state,
  you,
  legal,
  onAction,
  onManage,
  onTrade,
}: {
  state: GameState;
  you: string | null;
  legal: string[];
  onAction: (event: string, payload?: unknown) => void;
  onManage: () => void;
  onTrade: () => void;
}) {
  const { d } = useI18n();
  const me = state.players.find((p) => p.id === you);
  const current = state.players.find((p) => p.id === state.order[state.turnIndex]);
  const isTurn = current?.id === you;
  const can = (a: string) => legal.includes(a);

  const spectating = !me;
  const owed = state.debt?.debtorId === you ? state.debt : null;

  return (
    <motion.div
      layout
      className="surface-raised flex flex-wrap items-center justify-center gap-2 p-3 shadow-lift"
    >
      {spectating ? (
        <p className="px-2 py-1.5 text-sm text-muted">{d.game.spectating}</p>
      ) : (
        <>
          <p className="mr-auto hidden px-2 text-sm font-semibold sm:block">
            {isTurn ? (
              <span className="text-brand">{d.game.yourTurn}</span>
            ) : (
              <span className="text-muted">
                {d.game.waitingFor.replace('{nick}', current?.nick ?? '…')}
              </span>
            )}
          </p>

          {owed && (
            <button className="btn-danger" onClick={() => onAction('declare_bankruptcy')}>
              {d.game.declareBankruptcy}
            </button>
          )}

          {can('pay_bail') && (
            <button className="btn-ghost" onClick={() => onAction('pay_bail')}>
              {d.game.payBail} (${state.settings.bailAmount})
            </button>
          )}
          {can('use_jail_card') && (
            <button className="btn-ghost" onClick={() => onAction('use_jail_card')}>
              {d.game.useCard}
            </button>
          )}

          {can('roll_dice') && (
            <button className="btn-primary px-6" onClick={() => onAction('roll_dice')}>
              {state.doublesCount > 0 ? d.game.rollAgain : d.game.roll}
            </button>
          )}

          {can('buy_property') && (
            <button className="btn-mint" onClick={() => onAction('buy_property')}>
              {d.game.buy}
            </button>
          )}
          {can('decline_purchase') && (
            <button className="btn-ghost" onClick={() => onAction('decline_purchase')}>
              {state.settings.allowAuctions ? d.game.auction : d.game.pass}
            </button>
          )}

          {can('end_turn') && (
            <button className="btn-primary px-6" onClick={() => onAction('end_turn')}>
              {d.game.endTurn}
            </button>
          )}

          <button className="btn-ghost" onClick={onManage}>
            {d.game.manage}
          </button>
          <button className="btn-ghost" onClick={onTrade}>
            {d.game.trade}
          </button>
        </>
      )}
    </motion.div>
  );
}
