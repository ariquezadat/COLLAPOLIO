import type { Metadata } from 'next';
import Link from 'next/link';
import { getDict, isLocale, type Locale } from '@/i18n';
import { RoomBrowser } from '@/components/RoomBrowser';
import { Logo } from '@/components/Iso';
import { LocaleSwitch } from '@/components/LocaleSwitch';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const d = getDict(params.locale);
  return { title: d.rooms.title, description: d.rooms.subtitle };
}

export default function RoomsPage({ params }: { params: { locale: string } }) {
  const locale = (isLocale(params.locale) ? params.locale : 'es') as Locale;
  const d = getDict(locale);
  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center gap-2.5">
          <Logo size={26} />
          <span className="font-extrabold tracking-tight">{d.brand}</span>
        </Link>
        <LocaleSwitch />
      </header>
      <h1 className="text-3xl font-bold tracking-tight">{d.rooms.title}</h1>
      <p className="mb-8 mt-1 text-muted">{d.rooms.subtitle}</p>
      <RoomBrowser />
    </main>
  );
}
