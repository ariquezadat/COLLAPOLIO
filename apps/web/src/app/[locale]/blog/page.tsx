import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = { title: 'Blog' };

/** El nombre completo no se parte entre líneas */
function Nombre() {
  return <span className="whitespace-nowrap">Ariel Quezada Tovar</span>;
}

/** Dedicatoria del autor. El `<3` va como string para que JSX no lo lea como etiqueta. */
function Dedicatoria({ es }: { es: boolean }) {
  return (
    <figure className="my-2 rounded-2xl border border-brand/30 bg-brand/[0.07] p-6 text-center sm:p-8">
      <blockquote className="text-balance text-lg font-semibold leading-snug text-fg sm:text-xl">
        {es ? (
          <>
            Este juego fue diseñado por <Nombre /> con mucho cariño para{' '}
            <span className="whitespace-nowrap">
              los JETS 14 <span className="text-danger">{'<3'}</span>
            </span>
          </>
        ) : (
          <>
            This game was designed by <Nombre /> with a lot of love for{' '}
            <span className="whitespace-nowrap">
              the JETS 14 <span className="text-danger">{'<3'}</span>
            </span>
          </>
        )}
      </blockquote>
    </figure>
  );
}

export default function Page({ params }: { params: { locale: string } }) {
  const es = params.locale !== 'en';
  return (
    <StaticPage locale={params.locale} title="Blog">
      <Dedicatoria es={es} />
      {es ? (
        <p>
          Todavía no hay entradas publicadas. Aquí iremos contando cambios de balance, nuevas reglas
          opcionales y lo que aprendamos mirando partidas.
        </p>
      ) : (
        <p>
          No posts yet. This is where we will write about balance changes, new optional rules and
          whatever we learn from watching games.
        </p>
      )}
    </StaticPage>
  );
}
