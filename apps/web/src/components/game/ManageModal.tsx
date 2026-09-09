'use client';

import type { GameState } from '@collapolio/engine';
import { GROUP_COLORS, canBuildHouse, canSellHouse, ownsFullSet } from '@collapolio/engine';
import { money } from '@/lib/format';
import { useI18n } from '../I18nProvider';
import { Modal } from './Modal';

export function ManageModal({
  open,
  onClose,
  state,
  you,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  state: GameState;
  you: string | null;
  onAction: (event: string, payload?: unknown) => void;
}) {
  const { d } = useI18n();
  const me = state.players.find((p) => p.id === you);
  if (!me) return null;

  const tiles = me.properties.map((i) => state.board[i]);
  const groups = new Map<string, typeof tiles>();
  for (const t of tiles) {
    const key = t.group ?? 'otros';
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  return (
    <Modal open={open} onClose={onClose} title={d.game.manage} wide>
      {tiles.length === 0 && <p className="text-sm text-muted">{d.game.nothingToBuild}</p>}

      <div className="space-y-4">
        {[...groups.entries()].map(([group, list]) => {
          const full = list[0]?.group ? ownsFullSet(state, list[0]) : false;
          return (
            <section key={group}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2.5 w-8 rounded-full"
                  style={{ background: GROUP_COLORS[group as never] ?? '#4a5570' }}
                />
                {full && (
                  <span className="chip border-mint/40 px-2 py-0 text-[10px] text-mint">
                    set · {d.settings.x2RentOnFullSet}
                  </span>
                )}
              </div>

              <ul className="grid gap-2 sm:grid-cols-2">
                {list.map((tile) => {
                  const name = (d.tile as Record<string, string>)[tile.name] ?? tile.name;
                  const buildErr = canBuildHouse(state, me.id, tile.index);
                  const sellErr = canSellHouse(state, me.id, tile.index);
                  const unmortgageCost = Math.ceil(((tile.mortgageValue ?? 0) * 11) / 10);
                  return (
                    <li
                      key={tile.index}
                      className={`rounded-xl border border-line/10 bg-ink/40 p-3 ${
                        tile.mortgaged ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{name}</p>
                          <p className="num text-[11px] text-muted">
                            {tile.mortgaged
                              ? d.game.mortgaged
                              : (tile.houses ?? 0) === 5
                                ? d.game.hotel
                                : `${tile.houses ?? 0} ${d.game.houses}`}
                          </p>
                        </div>
                        {(tile.houses ?? 0) > 0 && (
                          <div className="flex shrink-0 gap-0.5">
                            {(tile.houses ?? 0) === 5 ? (
                              <span className="rounded bg-danger px-1 text-[9px] font-bold text-white">
                                H
                              </span>
                            ) : (
                              Array.from({ length: tile.houses ?? 0 }).map((_, i) => (
                                <span key={i} className="h-2 w-2 rounded-sm bg-mint" />
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {tile.type === 'PROPERTY' && (
                          <>
                            <button
                              className="chip disabled:opacity-30"
                              disabled={!!buildErr}
                              onClick={() => onAction('build_house', { tileIndex: tile.index })}
                            >
                              {d.game.build} {money(tile.houseCost ?? 0)}
                            </button>
                            <button
                              className="chip disabled:opacity-30"
                              disabled={!!sellErr}
                              onClick={() => onAction('sell_house', { tileIndex: tile.index })}
                            >
                              {d.game.sell} +{money(Math.floor((tile.houseCost ?? 0) / 2))}
                            </button>
                          </>
                        )}
                        {state.settings.mortgageEnabled &&
                          (tile.mortgaged ? (
                            <button
                              className="chip disabled:opacity-30"
                              disabled={me.money < unmortgageCost}
                              onClick={() => onAction('unmortgage', { tileIndex: tile.index })}
                            >
                              {d.game.unmortgage} {money(unmortgageCost)}
                            </button>
                          ) : (
                            <button
                              className="chip disabled:opacity-30"
                              disabled={(tile.houses ?? 0) > 0}
                              onClick={() => onAction('mortgage', { tileIndex: tile.index })}
                            >
                              {d.game.mortgage} +{money(tile.mortgageValue ?? 0)}
                            </button>
                          ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <button className="btn-ghost mt-5 w-full" onClick={onClose}>
        {d.game.close}
      </button>
    </Modal>
  );
}
