import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = { title: 'Info' };

export default function Page({ params }: { params: { locale: string } }) {
  const es = params.locale !== 'en';
  return (
    <StaticPage locale={params.locale} title={es ? 'Info' : 'Info'}>
      {es ? (
        <><p>CollaPolio es un juego de mesa de economía urbana para 2 a 8 jugadores, en tiempo real y directo en el navegador. No hay que descargar nada ni crear una cuenta: eliges un nombre, una ficha y entras.</p><h2>Cómo funciona</h2><p>Cada sala corre en un servidor autoritativo: el cliente sólo muestra el estado y envía intenciones. Nadie puede inventarse dinero ni tiradas.</p><h2>Original</h2><p>Nombres, tablero, cartas, ilustraciones y sonidos son propios. Es una alternativa libre, no un producto oficial de ninguna marca.</p></>
      ) : (
        <><p>CollaPolio is a real-time urban economy board game for 2 to 8 players, right in the browser. No downloads, no account: pick a name, pick a token, play.</p><h2>How it works</h2><p>Every room runs on an authoritative server: the client only renders state and sends intents. Nobody can invent money or dice rolls.</p><h2>Original</h2><p>Names, board, cards, illustrations and sounds are our own. This is a free alternative, not an official product of any brand.</p></>
      )}
    </StaticPage>
  );
}
