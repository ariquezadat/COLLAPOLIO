'use client';

import { useEffect, useRef, useState } from 'react';
import { money } from '@/lib/format';

/** Contador que se anima al cambiar, para que el dinero "se sienta". */
export function Money({ value, className = '' }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [delta, setDelta] = useState<number | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const from = display;
    const diff = value - from;
    if (diff === 0) return;
    // Con la pestaña en segundo plano rAF no corre: se salta la animación
    if (typeof document !== 'undefined' && document.hidden) {
      setDisplay(value);
      return;
    }
    setDelta(diff);
    const start = performance.now();
    const duration = Math.min(700, 220 + Math.abs(diff) * 0.4);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + diff * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    const clear = setTimeout(() => setDelta(null), 1200);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      clearTimeout(clear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className={`num relative inline-flex items-center ${className}`}>
      {money(display)}
      {delta !== null && delta !== 0 && (
        <span
          className={`absolute -top-4 left-full ml-1 whitespace-nowrap text-[11px] font-bold ${
            delta > 0 ? 'text-mint' : 'text-danger'
          }`}
        >
          {delta > 0 ? '+' : ''}
          {money(delta)}
        </span>
      )}
    </span>
  );
}
