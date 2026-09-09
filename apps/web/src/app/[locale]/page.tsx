import type { Metadata } from 'next';
import Link from 'next/link';
import { getDict, isLocale, type Locale } from '@/i18n';
import { LandingActions } from '@/components/LandingActions';
import { LocaleSwitch } from '@/components/LocaleSwitch';
import { ILLUSTRATIONS, Logo } from '@/components/Iso';

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = (isLocale(params.locale) ? params.locale : 'es') as Locale;
  const d = getDict(locale);
  const title = `CollaPolio — ${d.tagline}`;
  const description = d.landing.heroSub;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/${locale}`, languages: { es: '/es', en: '/en' } },
    keywords: [
      'juego de mesa online',
      'multijugador en tiempo real',
      'economía de propiedades',
      'board game online',
      'browser game',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'es' ? 'es_ES' : 'en_US',
      siteName: 'CollaPolio',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function Landing({ params }: { params: { locale: string } }) {
  const locale = (isLocale(params.locale) ? params.locale : 'es') as Locale;
  const d = getDict(locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'CollaPolio',
    description: d.landing.heroSub,
    genre: ['Board game', 'Strategy'],
    playMode: 'MultiPlayer',
    applicationCategory: 'Game',
    operatingSystem: 'Web browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <main className="relative min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-lg font-extrabold tracking-tight">{d.brand}</span>
        </div>
        <LocaleSwitch />
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pb-10 pt-8 text-center sm:pt-16">
        <div className="mx-auto mb-7 w-fit animate-floaty">
          <Logo size={78} />
        </div>
        <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
          {d.brand}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-lg font-medium text-fg/90 sm:text-xl">
          {d.tagline}
        </p>
        <p className="mx-auto mt-3 max-w-lg text-pretty text-sm text-muted">{d.landing.heroSub}</p>

        <div className="mt-9">
          <LandingActions />
        </div>

        <p className="mt-6 text-xs text-muted">
          <span className="chip">{d.landing.desktopBanner}</span>
        </p>
      </section>

      {/* Cómo se juega */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{d.landing.howTitle}</h2>
          <p className="mt-2 text-muted">{d.landing.howSub}</p>
        </div>

        <div className="space-y-6">
          {d.landing.steps.map((step, i) => {
            const Illustration = ILLUSTRATIONS[i % ILLUSTRATIONS.length];
            const flipped = i % 2 === 1;
            return (
              <article
                key={step.t}
                className={`surface flex flex-col items-center gap-6 p-6 sm:p-8 ${
                  flipped ? 'md:flex-row-reverse' : 'md:flex-row'
                }`}
              >
                <div className="h-40 w-full max-w-[240px] shrink-0">
                  <Illustration />
                </div>
                <div className={flipped ? 'md:text-right' : ''}>
                  <span className="num text-xs font-bold uppercase tracking-widest text-brand">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-1 text-xl font-bold">{step.t}</h3>
                  <p className="mt-2 text-pretty text-muted">{step.d}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-line/[0.07] px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="font-semibold text-fg/80">{d.brand}</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link className="hover:text-fg" href={`/${locale}/info`}>
              {d.landing.footer.info}
            </Link>
            <Link className="hover:text-fg" href={`/${locale}/blog`}>
              {d.landing.footer.blog}
            </Link>
            <Link className="hover:text-fg" href={`/${locale}/terminos`}>
              {d.landing.footer.terms}
            </Link>
            <Link className="hover:text-fg" href={`/${locale}/privacidad`}>
              {d.landing.footer.privacy}
            </Link>
            <Link className="hover:text-fg" href={`/${locale}/cookies`}>
              {d.landing.footer.cookies}
            </Link>
          </nav>
        </div>
      </footer>

      {/* Botón flotante de comunidad */}
      <a
        href="https://discord.gg"
        target="_blank"
        rel="noreferrer noopener"
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full border border-line/10 bg-raised/90 px-4 py-3 text-sm font-semibold shadow-lift backdrop-blur transition hover:scale-[1.03]"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
          <path d="M19.3 5.4A16 16 0 0 0 15.4 4l-.2.4a12 12 0 0 1 3.3 1.6 12.6 12.6 0 0 0-9-1.4 12.4 12.4 0 0 0-2 .6A12 12 0 0 1 8.8 4.4L8.6 4a16 16 0 0 0-3.9 1.4C2.2 9.2 1.5 12.9 1.9 16.5A16 16 0 0 0 6.7 19l1-1.4a10.4 10.4 0 0 1-1.6-.8l.4-.3a11.4 11.4 0 0 0 9.8 0l.4.3c-.5.3-1 .6-1.6.8l1 1.4a16 16 0 0 0 4.8-2.5c.5-4.2-.7-7.9-1.6-11.1ZM8.7 14.3c-1 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.8 2-1.7 2Zm6.6 0c-1 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.7 2-1.7 2Z" />
        </svg>
        {d.nav.community}
      </a>
    </main>
  );
}
