'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { GameState } from '@collapolio/engine';
import { money } from '@/lib/format';
import { Avatar } from '../Avatar';
import { useI18n } from '../I18nProvider';
import { Modal } from './Modal';

/** Deuda pendiente: liquidar o quebrar. */
export function DebtModal({
  state,
  you,
  onManage,
  onBankrupt,
}: {
  state: GameState;
  you: string | null;
  onManage: () => void;
  onBankrupt: () => void;
}) {
  const { d } = useI18n();
  const debt = state.debt;
  if (!debt || debt.debtorId !== you) return null;
  const me = state.players.find((p) => p.id === you);
  if (!me) return null;

  const missing = Math.max(0, debt.amount - me.money);

  return (
    <Modal open title={d.game.debtTitle.replace('{amount}', money(debt.amount))}>
      <p className="text-sm text-muted">{d.game.debtBody}</p>
      <dl className="my-4 space-y-1.5 rounded-xl border border-line/10 bg-ink/50 p-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">{d.game.cash}</dt>
          <dd className="num font-bold">{money(me.money)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">{d.game.debtTitle.replace('{amount}', '')}</dt>
          <dd className="num font-bold text-danger">{money(debt.amount)}</dd>
        </div>
        {missing > 0 && (
          <div className="flex justify-between border-t border-line/10 pt-1.5">
            <dt className="text-muted">Falta</dt>
            <dd className="num font-bold text-warn">{money(missing)}</dd>
          </div>
        )}
      </dl>
      <div className="flex gap-2">
        <button className="btn-danger flex-1" onClick={onBankrupt}>
          {d.game.declareBankruptcy}
        </button>
        <button className="btn-primary flex-1" onClick={onManage}>
          {d.game.manage}
        </button>
      </div>
    </Modal>
  );
}

/** Podio final. */
export function GameOverModal({ state, locale }: { state: GameState; locale: string }) {
  const { d } = useI18n();
  if (state.phase !== 'GAME_OVER') return null;

  const ranking = [...state.players].sort((a, b) => {
    if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
    return (b.netWorth ?? b.money) - (a.netWorth ?? a.money);
  });
  const winner = ranking[0];
  const medals = ['#ffd166', '#c9d1e4', '#c98b52'];

  return (
    <Modal open title={d.game.gameOver}>
      <p className="mb-5 text-center text-lg font-bold text-balance">
        {d.game.winner.replace('{nick}', winner?.nick ?? '—')}
      </p>

      <ol className="space-y-2">
        {ranking.map((p, i) => (
          <motion.li
            key={p.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              i === 0 ? 'border-warn/40 bg-warn/5' : 'border-line/10 bg-ink/40'
            }`}
          >
            <span
              className="num grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold text-ink"
              style={{ background: medals[i] ?? 'rgb(var(--c-raised))', color: i < 3 ? '#0a0d15' : undefined }}
            >
              {i + 1}
            </span>
            <Avatar avatar={p.avatar} color={p.color} size={22} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.nick}</span>
            <span className={`num text-sm font-bold ${p.bankrupt ? 'text-muted line-through' : ''}`}>
              {money(p.netWorth ?? p.money)}
            </span>
          </motion.li>
        ))}
      </ol>

      <div className="mt-5 flex gap-2">
        <Link className="btn-ghost flex-1" href={`/${locale}`}>
          {d.game.backHome}
        </Link>
        <Link className="btn-primary flex-1" href={`/${locale}/salas`}>
          {d.game.rematch}
        </Link>
      </div>
    </Modal>
  );
}
