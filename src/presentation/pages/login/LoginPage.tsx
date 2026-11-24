import { CalendarPlus } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router';
import { homeFor, isClientAreaPath, paths } from '../../app/routes';
import { SignInPanel } from '../../components/auth/SignInPanel';
import { Brand } from '../../components/layout/Brand';
import { useSession } from '../../hooks/useSession';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.auth;

/** Only internal panel paths are accepted as "come back to" targets. */
function returnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' &&
    from.startsWith('/') &&
    from !== paths.login &&
    !isClientAreaPath(from)
    ? from
    : paths.today;
}

/** Panel sign-in (staff). A client who signs in here is taken to the client area. */
export function LoginPage() {
  const session = useSession();
  const location = useLocation();

  if (session.data) {
    const target =
      session.data.role === 'CLIENT' ? homeFor(session.data) : returnPath(location.state);
    return <Navigate to={target} replace />;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <Brand large />
        <p className="text-fg-muted">{ptBR.app.tagline}</p>
      </header>

      <SignInPanel audience="staff" subtitle={t.subtitle} />

      <Link
        to={paths.client.login}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl font-semibold text-accent underline-offset-4 hover:underline"
      >
        <CalendarPlus aria-hidden="true" className="size-5" />
        {t.clientAreaLink}
      </Link>
    </main>
  );
}
