import Link from 'next/link';
import { Logo } from './Iso';

export function StaticPage({
  locale,
  title,
  updated,
  children,
}: {
  locale: string;
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-5 py-10">
      <Link href={`/${locale}`} className="mb-10 flex w-fit items-center gap-2.5">
        <Logo size={26} />
        <span className="font-extrabold tracking-tight">CollaPolio</span>
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {updated && <p className="mt-1 text-sm text-muted">{updated}</p>}
      <div className="prose-invert mt-8 space-y-4 text-pretty leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-fg [&_strong]:text-fg">
        {children}
      </div>
    </main>
  );
}
