'use client';

import { motion } from 'framer-motion';
import type { Player, Tile as TileModel } from '@collapolio/engine';
import { GROUP_COLORS } from '@collapolio/engine';
import { placeTile, stripeSide } from '@/lib/layout';
import { useI18n } from '../I18nProvider';
import { Avatar } from '../Avatar';

const CORNER_GLYPH: Record<string, string> = {
  GO: 'M4 12h13m0 0-5-5m5 5-5 5',
  JAIL: 'M5 4v16M9 4v16M15 4v16M19 4v16M3 8h18M3 16h18',
  FREE_PARKING: 'M6 20V6h5a4 4 0 0 1 0 8H6',
  GOTO_JAIL: 'M20 12H7m0 0 5-5m-5 5 5 5',
};

const TYPE_GLYPH: Record<string, string> = {
  CHANCE: 'M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7V14m0 3.5h.01',
  CHEST: 'M3 8h18v11H3zM3 8l2-4h14l2 4M12 8v11M9 12h6',
  TAX: 'M12 3v18M8 7h6a2.5 2.5 0 0 1 0 5H10a2.5 2.5 0 0 0 0 5h6',
  RAIL: 'M4 20 20 4M8 4l12 12M4 10h6M14 14h6',
  UTILITY: 'M13 2 4 14h7l-1 8 9-12h-7z',
};

export function TileView({
  tile,
  players,
  owner,
  highlight,
  onClick,
}: {
  tile: TileModel;
  players: Player[];
  owner?: Player;
  highlight?: boolean;
  onClick?: () => void;
}) {
  const { d } = useI18n();
  const place = placeTile(tile.index);
  const isCorner = place.side === 'corner';
  const stripe = stripeSide(place.side);
  const groupColor = tile.group ? GROUP_COLORS[tile.group] : undefined;
  const name = (d.tile as Record<string, string>)[tile.name] ?? tile.name;
  const houses = tile.houses ?? 0;

  const stripeStyle: React.CSSProperties =
    stripe === 'top'
      ? { top: 0, left: 0, right: 0, height: '22%' }
      : stripe === 'bottom'
        ? { bottom: 0, left: 0, right: 0, height: '22%' }
        : stripe === 'left'
          ? { left: 0, top: 0, bottom: 0, width: '22%' }
          : { right: 0, top: 0, bottom: 0, width: '22%' };

  const glyph = isCorner ? CORNER_GLYPH[tile.type] : TYPE_GLYPH[tile.type];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ gridRow: place.row, gridColumn: place.col }}
      className={`group relative overflow-hidden border border-line/[0.08] bg-surface/90 text-left transition
        ${isCorner ? 'rounded-lg' : ''}
        ${highlight ? 'z-10 ring-2 ring-brand' : ''}
        ${onClick ? 'cursor-pointer hover:bg-raised' : 'cursor-default'}`}
    >
      {groupColor && tile.type === 'PROPERTY' && (
        <span className="absolute" style={{ ...stripeStyle, background: groupColor }} />
      )}

      {owner && (
        <span
          className="absolute inset-0"
          style={{ background: owner.color, opacity: tile.mortgaged ? 0.08 : 0.16 }}
        />
      )}

      <div
        className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 p-[3%] text-center ${
          stripe === 'top' ? 'pt-[24%]' : stripe === 'bottom' ? 'pb-[24%]' : ''
        } ${stripe === 'left' ? 'pl-[24%]' : stripe === 'right' ? 'pr-[24%]' : ''}`}
      >
        {glyph && (
          <svg
            viewBox="0 0 24 24"
            className={isCorner ? 'h-5 w-5 opacity-70' : 'h-3.5 w-3.5 opacity-60'}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={glyph} />
          </svg>
        )}
        <span
          className={`w-full leading-tight ${
            isCorner ? 'text-[9px] font-bold uppercase tracking-wide' : 'text-[8px] font-semibold'
          }`}
        >
          {name}
        </span>
        {tile.price !== undefined && !isCorner && (
          <span className="num text-[8px] font-bold text-muted">${tile.price}</span>
        )}
        {tile.amount !== undefined && (
          <span className="num text-[8px] font-bold text-muted">${tile.amount}</span>
        )}
        {tile.mortgaged && (
          <span className="text-[7px] font-bold uppercase tracking-wide text-danger">
            {d.game.mortgaged}
          </span>
        )}
      </div>

      {houses > 0 && (
        <span className="absolute inset-x-0 top-0 flex justify-center gap-[2px] p-[3px]">
          {houses === 5 ? (
            <span className="rounded-[3px] bg-danger px-1 text-[7px] font-bold text-white">
              HOTEL
            </span>
          ) : (
            Array.from({ length: houses }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-[2px] bg-mint" />
            ))
          )}
        </span>
      )}

      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-center gap-[2px] p-[4%]">
        {players.map((p) => (
          <motion.span
            key={p.id}
            layoutId={`token-${p.id}`}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            className="grid h-[14px] w-[14px] place-items-center rounded-full border shadow"
            style={{
              background: `${p.color}33`,
              borderColor: p.color,
              boxShadow: `0 0 8px ${p.color}66`,
            }}
          >
            <Avatar avatar={p.avatar} color={p.color} size={9} />
          </motion.span>
        ))}
      </span>
    </button>
  );
}
