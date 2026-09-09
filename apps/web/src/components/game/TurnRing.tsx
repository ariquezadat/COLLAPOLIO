'use client';

import { useEffect, useState } from 'react';

/** Anillo circular que cuenta el tiempo restante del turno. */
export function TurnRing({
  deadline,
  total,
  skew = 0,
  size = 30,
}: {
  deadline: number | null;
  total: number;
  skew?: number;
  size?: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!deadline || total <= 0) return null;

  const left = Math.max(0, deadline - (now + skew));
  const ratio = Math.max(0, Math.min(1, left / (total * 1000)));
  const r = size / 2 - 3;
  const circumference = 2 * Math.PI * r;
  const seconds = Math.ceil(left / 1000);

  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="2.5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ratio < 0.25 ? 'rgb(255 92 122)' : 'rgb(124 107 255)'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 250ms linear' }}
        />
      </svg>
      <span className="num absolute text-[9px] font-bold">{seconds}</span>
    </span>
  );
}
