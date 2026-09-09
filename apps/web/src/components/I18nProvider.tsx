'use client';

import { createContext, useContext, useMemo } from 'react';
import { fill, getDict, type Dict, type Locale } from '@/i18n';

interface Ctx {
  locale: Locale;
  d: Dict;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<Ctx | null>(null);

function resolve(dict: unknown, path: string): string {
  const parts = path.split('.');
  let node: any = dict;
  for (const p of parts) {
    if (node == null) return path;
    node = node[p];
  }
  return typeof node === 'string' ? node : path;
}

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo<Ctx>(() => {
    const d = getDict(locale);
    return { locale, d, t: (path, params) => fill(resolve(d, path), params) };
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n fuera de I18nProvider');
  return ctx;
}
