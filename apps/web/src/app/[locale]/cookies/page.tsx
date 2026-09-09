import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = { title: 'Cookies' };

export default function Page({ params }: { params: { locale: string } }) {
  const es = params.locale !== 'en';
  return (
    <StaticPage locale={params.locale} title={es ? 'Cookies' : 'Cookies'}>
      {es ? (
        <><p>No usamos cookies de seguimiento. Guardamos en <strong>localStorage</strong> tu nombre, tu ficha y si prefieres el sonido apagado. Nada de eso sale de tu navegador.</p></>
      ) : (
        <><p>We use no tracking cookies. We keep your name, your token and your sound preference in <strong>localStorage</strong>. None of it leaves your browser.</p></>
      )}
    </StaticPage>
  );
}
