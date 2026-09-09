import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import { RegisterSW } from '@/components/RegisterSW';
import './globals.css';

const sans = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['ui-rounded', 'system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'CollaPolio', template: '%s · CollaPolio' },
  applicationName: 'CollaPolio',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'CollaPolio', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#070A11',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={sans.variable}>
      <head>
        {/* Config de runtime: define la URL del servidor de partidas.
            Va sin defer para que exista antes de que hidrate la app. */}
        <script src="/config.js" />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
