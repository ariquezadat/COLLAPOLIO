import type { MetadataRoute } from 'next';
import { locales } from '@/i18n';

const PATHS = ['', '/salas', '/info', '/blog', '/terminos', '/privacidad', '/cookies'];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return locales.flatMap((locale) =>
    PATHS.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.6,
    })),
  );
}
