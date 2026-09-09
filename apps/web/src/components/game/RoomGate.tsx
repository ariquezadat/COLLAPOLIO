'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '../I18nProvider';
import { Logo } from '../Iso';
import { RoomScreen } from './RoomScreen';

const CODE_RE = /^[A-Z0-9]{4,10}$/;

/** Lee el código de sala de la query y valida su forma antes de conectar. */
export function RoomGate({ locale }: { locale: string }) {
  const { d } = useI18n();
  const params = useSearchParams();
  const code = (params.get('c') ?? '').toUpperCase();

  if (!CODE_RE.test(code)) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="surface max-w-sm p-8">
          <span className="mb-4 inline-block">
            <Logo size={36} />
          </span>
          <p className="mb-5 text-lg font-semibold">{d.errors.no_room}</p>
          <Link className="btn-primary" href={`/${locale}/salas`}>
            {d.nav.rooms}
          </Link>
        </div>
      </main>
    );
  }

  return <RoomScreen code={code} locale={locale} />;
}
