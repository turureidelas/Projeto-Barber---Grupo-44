import type { DemoAccount } from '@application/use-cases';
import { zodResolver } from '@hookform/resolvers/zod';
import { FlaskConical, LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useDemoAccounts, useIsDemo } from '../../hooks/useDemo';
import { useSignIn } from '../../hooks/useSession';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';
import { ResetDemoButton } from '../demo/ResetDemoButton';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TextField } from '../ui/fields';

const t = ptBR.auth;

const schema = z.object({
  email: z.string().trim().min(1, t.emailRequired).pipe(z.email(t.emailInvalid)),
  password: z.string().min(1, t.passwordRequired),
});

type FormValues = z.infer<typeof schema>;

export type SignInAudience = 'staff' | 'client';

interface SignInPanelProps {
  readonly audience: SignInAudience;
  readonly subtitle: string;
}

/**
 * E-mail + password form, plus one-tap demo accounts of this audience (panel or client area).
 * The page decides where to go once the session exists.
 */
export function SignInPanel({ audience, subtitle }: SignInPanelProps) {
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

  const submit = handleSubmit((values) => {
    signIn.mutate(values);
  });

  return (
    <>
      <Card>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-1 mb-5 text-fg-muted">{subtitle}</p>
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
          audience={audience}
          pendingEmail={signIn.isPending ? signIn.variables.email : null}
          onPick={(account) => {
            signIn.mutate({ email: account.email, password: account.password });
          }}
        />
      )}
    </>
  );
}

interface DemoAccessProps {
  readonly audience: SignInAudience;
  readonly pendingEmail: string | null;
  readonly onPick: (account: DemoAccount) => void;
}

function DemoAccess({ audience, pendingEmail, onPick }: DemoAccessProps) {
  const accounts = useDemoAccounts();
  const visible = (accounts.data ?? []).filter(
    (account) => (account.role === 'CLIENT') === (audience === 'client'),
  );
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
        {visible.map((account) => {
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
