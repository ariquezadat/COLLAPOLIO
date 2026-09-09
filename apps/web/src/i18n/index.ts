import { es, type Dict } from './es';
import { en } from './en';

export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

const dicts: Record<Locale, Dict> = { es, en };

export function getDict(locale: string): Dict {
  return dicts[(locale as Locale) in dicts ? (locale as Locale) : defaultLocale];
}

export function isLocale(v: string): v is Locale {
  return (locales as readonly string[]).includes(v);
}

/** Reemplaza {placeholders} en una plantilla */
export function fill(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

export type { Dict };
