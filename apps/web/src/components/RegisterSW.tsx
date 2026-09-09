'use client';

import { useEffect } from 'react';

/** Registra el service worker sólo en producción. */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const timer = setTimeout(() => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
