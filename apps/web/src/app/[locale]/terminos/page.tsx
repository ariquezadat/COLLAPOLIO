import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = { title: 'Términos' };

export default function Page({ params }: { params: { locale: string } }) {
  const es = params.locale !== 'en';
  return (
    <StaticPage locale={params.locale} title={es ? 'Términos' : 'Terms'}>
      {es ? (
        <><p>CollaPolio se ofrece tal cual, sin garantías. Al usarlo aceptas jugar limpio: nada de automatizar clientes, saturar el servidor ni acosar a otras personas.</p><h2>Cuentas</h2><p>Jugar no requiere cuenta. Si creas una para guardar estadísticas, puedes pedir su borrado cuando quieras.</p><h2>Contenido</h2><p>Los nombres que escribas en el chat son responsabilidad tuya. Podemos cerrar salas que se usen para hostigar.</p></>
      ) : (
        <><p>CollaPolio is provided as is, without warranties. By using it you agree to play fair: no automated clients, no flooding the server, no harassing other people.</p><h2>Accounts</h2><p>Playing needs no account. If you create one to keep stats, you can request deletion at any time.</p><h2>Content</h2><p>Whatever you type in chat is your responsibility. We may close rooms used for harassment.</p></>
      )}
    </StaticPage>
  );
}
