'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { locales } from '@/i18n';
import { useI18n } from './I18nProvider';

export function LocaleSwitch() {
  const { locale } = useI18n();
  const pathname = usePathname() ?? '/';

  return (
    <div className="flex items-center gap-1 rounded-full border border-line/10 bg-raised/60 p-1">
      {locales.map((l) => (
        <Link
          key={l}
          href={pathname.replace(/^\/[^/]+/, `/${l}`)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition ${
            l === locale ? 'bg-brand text-white' : 'text-muted hover:text-fg'
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
