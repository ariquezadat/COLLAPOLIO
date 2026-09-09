'use client';

import { useState } from 'react';
import { useI18n } from '../I18nProvider';

/** Caja de invitación: el enlace corto que se manda a los amigos. */
export function ShareBox({ code }: { code: string }) {
  const { d } = useI18n();
  const [copiado, setCopiado] = useState<'code' | 'link' | null>(null);

  async function copiar(tipo: 'code' | 'link') {
    const texto = tipo === 'code' ? code : `${window.location.origin}/j/${code}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      /* el navegador puede bloquear el portapapeles */
    }
  }

  return (
    <section className="surface shrink-0 p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{d.game.share}</h3>
      <p className="num mb-2.5 text-center text-xl font-extrabold tracking-[0.25em] text-brand">
        {code}
      </p>
      <div className="flex gap-2">
        <button className="btn-ghost flex-1 py-1.5 text-xs" onClick={() => void copiar('code')}>
          {copiado === 'code' ? d.lobby.copied : d.lobby.copy}
        </button>
        <button className="btn-primary flex-1 py-1.5 text-xs" onClick={() => void copiar('link')}>
          {copiado === 'link' ? d.lobby.copied : d.lobby.copyLink}
        </button>
      </div>
    </section>
  );
}
