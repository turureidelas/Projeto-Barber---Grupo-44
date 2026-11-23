import type { DemoAccount } from '@application/use-cases';
import { zodResolver } from '@hookform/resolvers/zod';
import { FlaskConical, LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';
import { z } from 'zod';
import { paths } from '../../app/routes';
import { ResetDemoButton } from '../../components/demo/ResetDemoButton';
import { Brand } from '../../components/layout/Brand';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextField } from '../../components/ui/fields';
import { useDemoAccounts, useIsDemo } from '../../hooks/useDemo';
import { useSession, useSignIn } from '../../hooks/useSession';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.auth;

const schema = z.object({
  email: z.string().trim().min(1, t.emailRequired).pipe(z.email(t.emailInvalid)),
  password: z.string().min(1, t.passwordRequired),
});

type FormValues = z.infer<typeof schema>;

/** Only internal paths are accepted as "come back to" targets. */
function returnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' && from.startsWith('/') && from !== paths.login
    ? from
    : paths.today;
}

export function LoginPage() {
  const session = useSession();
  const location = useLocation();
  const signIn = useSignIn();
  const isDemo = useIsDemo();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (session.data) {
    return <Navigate to={returnPath(location.state)} replace />;
  }

  const submit = handleSubmit((values) => {
    signIn.mutate(values);
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <Brand large />
        <p className="text-fg-muted">{ptBR.app.tagline}</p>
      </header>

      <Card>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-1 mb-5 text-fg-muted">{t.subtitle}</p>
        <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <TextField
            label={t.email}
            type="email"
            autoComplete="username"
            inputMode="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label={t.password}
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {signIn.isError && (
            <p role="alert" className="font-medium text-danger">
              {errorMessage(signIn.error)}
            </p>
          )}
          <Button type="submit" size="lg" icon={LogIn} fullWidth loading={signIn.isPending}>
            {signIn.isPending ? t.submitting : t.submit}
          </Button>
        </form>
      </Card>

      {isDemo && (
        <DemoAccess
          pendingEmail={signIn.isPending ? signIn.variables.email : null}
          onPick={(account) => {
            signIn.mutate({ email: account.email, password: account.password });
          }}
        />
      )}
    </main>
  );
}

interface DemoAccessProps {
  readonly pendingEmail: string | null;
  readonly onPick: (account: DemoAccount) => void;
}

function DemoAccess({ pendingEmail, onPick }: DemoAccessProps) {
  const accounts = useDemoAccounts();
  return (
    <Card>
      <div className="mb-1 flex items-center gap-2">
        <FlaskConical aria-hidden="true" className="size-5 text-accent" />
        <h2 className="text-lg font-bold">{t.demoTitle}</h2>
        <Badge tone="accent" className="ml-auto">
          {ptBR.demo.badge}
        </Badge>
      </div>
      <p className="mb-4 text-fg-muted">{t.demoHint}</p>
      <ul className="flex flex-col gap-2">
        {(accounts.data ?? []).map((account) => {
          const role = ptBR.roles[account.role];
          return (
            <li key={account.email}>
              <button
                type="button"
                aria-label={t.demoSignInAs(account.name, role)}
                disabled={pendingEmail !== null}
                aria-busy={pendingEmail === account.email || undefined}
                onClick={() => {
                  onPick(account);
                }}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-line-strong bg-surface-2 px-3 text-left transition-colors hover:bg-surface-3 disabled:opacity-60"
              >
                <Avatar name={account.name} size="sm" />
                <span className="flex-1 font-semibold">{account.name}</span>
                <span className="text-sm text-fg-muted">{role}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 border-t border-line pt-4">
        <ResetDemoButton />
      </div>
    </Card>
  );
}
