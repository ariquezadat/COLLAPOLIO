import { notFound } from 'next/navigation';
import { I18nProvider } from '@/components/I18nProvider';
import { isLocale, locales } from '@/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  return <I18nProvider locale={params.locale}>{children}</I18nProvider>;
}
