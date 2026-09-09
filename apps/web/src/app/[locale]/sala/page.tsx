import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { RoomGate } from '@/components/game/RoomGate';
import { getDict, isLocale } from '@/i18n';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const d = getDict(params.locale);
  return {
    title: d.lobby.title,
    // Las salas no se indexan: son efímeras y privadas por defecto
    robots: { index: false, follow: false },
  };
}

/**
 * La sala vive en `?c=CODIGO` en vez de en un segmento dinámico: con export
 * estático no se pueden pre-generar rutas para códigos que aún no existen,
 * y así el enrutado del cliente sigue funcionando sin recargar.
 * Los enlaces bonitos (`/j/CODIGO`) redirigen aquí desde Firebase Hosting.
 */
export default function RoomPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  return (
    <Suspense>
      <RoomGate locale={params.locale} />
    </Suspense>
  );
}
