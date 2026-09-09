import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = { title: 'Privacidad' };

export default function Page({ params }: { params: { locale: string } }) {
  const es = params.locale !== 'en';
  return (
    <StaticPage locale={params.locale} title={es ? 'Privacidad' : 'Privacy'}>
      {es ? (
        <><p>Sin cuenta no guardamos datos personales. Tu nombre y tu ficha viven en el <strong>localStorage</strong> de tu navegador, no en nuestros servidores.</p><h2>Qué guarda el servidor</h2><p>El estado de las salas activas, con un identificador aleatorio por jugador. Las salas se borran solas a las pocas horas.</p><h2>Terceros</h2><p>No usamos analítica de terceros ni publicidad.</p></>
      ) : (
        <><p>Without an account we store no personal data. Your name and token live in your browser <strong>localStorage</strong>, not on our servers.</p><h2>What the server keeps</h2><p>The state of active rooms, with a random per-player identifier. Rooms are deleted automatically after a few hours.</p><h2>Third parties</h2><p>No third-party analytics, no ads.</p></>
      )}
    </StaticPage>
  );
}
