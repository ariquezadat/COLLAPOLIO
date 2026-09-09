import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = { title: 'Blog' };

export default function Page({ params }: { params: { locale: string } }) {
  const es = params.locale !== 'en';
  return (
    <StaticPage locale={params.locale} title={es ? 'Blog' : 'Blog'}>
      {es ? (
        <><p>Todavía no hay entradas publicadas. Aquí iremos contando cambios de balance, nuevas reglas opcionales y lo que aprendamos mirando partidas.</p></>
      ) : (
        <><p>No posts yet. This is where we will write about balance changes, new optional rules and whatever we learn from watching games.</p></>
      )}
    </StaticPage>
  );
}
