import { Link, Navigate, useLocation } from 'react-router';
import { isClientAreaPath, paths } from '../../app/routes';
import { SignInPanel } from '../../components/auth/SignInPanel';
import { Brand } from '../../components/layout/Brand';
import { useSession } from '../../hooks/useSession';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.clientArea.login;

/** Only client-area screens are accepted as "come back to" targets. */
function returnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' &&
    isClientAreaPath(from) &&
    from !== paths.client.login &&
    from !== paths.client.signUp
    ? from
    : paths.client.home;
}

/** Client sign-in. Staff who sign in here are taken to the panel. */
export function ClientLoginPage() {
  const session = useSession();
  const location = useLocation();

  if (session.data) {
    const target = session.data.role === 'CLIENT' ? returnPath(location.state) : paths.today;
    return <Navigate to={target} replace />;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="flex justify-center">
        <Brand large />
      </header>

      <SignInPanel audience="client" subtitle={t.subtitle} />

      <p className="text-center">
        {t.noAccount}{' '}
        <Link
          to={paths.client.signUp}
          className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
        >
          {t.createAccount}
        </Link>
      </p>
      <Link
        to={paths.login}
        className="flex min-h-11 items-center justify-center text-sm font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline"
      >
        {t.staffLink}
      </Link>
    </main>
  );
}
