import type { BarbershopDTO } from '@application/dto/catalog';
import { errorCodeOf } from '@application/errors';
import { MIN_PASSWORD_LENGTH } from '@application/use-cases';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, Navigate } from 'react-router';
import { z } from 'zod';
import { homeFor, paths } from '../../app/routes';
import { looksLikePhone } from '../../components/clients/client-form-schema';
import { Brand } from '../../components/layout/Brand';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CheckboxField, SelectField, TextField } from '../../components/ui/fields';
import { ErrorState, LoadingState } from '../../components/ui/states';
import { useBarbershops, useSignUpClient } from '../../hooks/useClientArea';
import { useSession } from '../../hooks/useSession';
import { useToast } from '../../hooks/useToast';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.clientArea.signUp;

const schema = z.object({
  barbershopId: z.string().min(1, t.barbershopRequired),
  name: z.string().trim().min(1, t.nameRequired).max(80),
  phone: z.string().trim().refine(looksLikePhone, t.phoneInvalid),
  email: z.string().trim().min(1, ptBR.auth.emailRequired).pipe(z.email(ptBR.auth.emailInvalid)),
  password: z.string().min(MIN_PASSWORD_LENGTH, t.passwordShort(MIN_PASSWORD_LENGTH)),
  consent: z.boolean().refine((value) => value, t.consentRequired),
});

type FormValues = z.infer<typeof schema>;

/** "Criar conta": the client registers with LGPD consent and lands in the client area. */
export function ClientSignUpPage() {
  const session = useSession();
  const barbershops = useBarbershops();

  if (session.data) {
    return <Navigate to={homeFor(session.data)} replace />;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="flex justify-center">
        <Brand large />
      </header>

      {barbershops.isPending ? (
        <LoadingState />
      ) : barbershops.isError ? (
        <ErrorState
          message={errorMessage(barbershops.error)}
          onRetry={() => void barbershops.refetch()}
        />
      ) : barbershops.data.length === 0 ? (
        <Card>
          <p className="text-fg-muted">{t.noBarbershop}</p>
        </Card>
      ) : (
        <SignUpForm barbershops={barbershops.data} />
      )}

      <p className="text-center">
        {t.haveAccount}{' '}
        <Link
          to={paths.client.login}
          className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
        >
          {t.signIn}
        </Link>
      </p>
    </main>
  );
}

/** Field-specific message when the phone or e-mail is already taken. */
function signUpError(error: unknown): string {
  if (errorCodeOf(error) === 'ALREADY_EXISTS') {
    const field = (error as { field?: unknown }).field;
    return field === 'email' ? t.emailTaken : t.phoneTaken;
  }
  return errorMessage(error);
}

function SignUpForm({ barbershops }: { readonly barbershops: readonly BarbershopDTO[] }) {
  const signUp = useSignUpClient();
  const toast = useToast();
  const [first] = barbershops;
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      barbershopId: barbershops.length === 1 && first ? first.id : '',
      name: '',
      phone: '',
      email: '',
      password: '',
      consent: false,
    },
  });
  const barbershopId = useWatch({ control, name: 'barbershopId' });
  const chosen = barbershops.find((shop) => shop.id === barbershopId);

  const submit = handleSubmit(({ consent, ...values }) => {
    signUp.mutate(
      { ...values, consentGiven: consent },
      {
        onSuccess: (user) => {
          toast.success(t.welcome(user.name.split(' ')[0] ?? user.name));
        },
      },
    );
  });

  return (
    <Card>
      <h1 className="text-2xl font-bold">{t.title}</h1>
      {chosen && <p className="mt-1 text-fg-muted">{t.subtitle(chosen.name)}</p>}
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="mt-5 flex flex-col gap-4"
      >
        {barbershops.length > 1 && (
          <SelectField
            label={t.barbershop}
            error={errors.barbershopId?.message}
            options={[
              { value: '', label: '—' },
              ...barbershops.map((shop) => ({ value: shop.id, label: shop.name })),
            ]}
            {...register('barbershopId')}
          />
        )}
        <TextField
          label={t.name}
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label={t.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hint={t.phoneHint}
          error={errors.phone?.message}
          {...register('phone')}
        />
        <TextField
          label={t.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          hint={t.emailHint}
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label={t.password}
          type="password"
          autoComplete="new-password"
          hint={t.passwordHint(MIN_PASSWORD_LENGTH)}
          error={errors.password?.message}
          {...register('password')}
        />
        <CheckboxField label={t.consent} error={errors.consent?.message} {...register('consent')} />
        <p className="flex gap-2 text-sm text-fg-muted">
          <ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-success" />
          {t.privacyNote}
        </p>
        {signUp.isError && (
          <p role="alert" className="font-medium text-danger">
            {signUpError(signUp.error)}
          </p>
        )}
        <Button type="submit" size="lg" icon={UserPlus} fullWidth loading={signUp.isPending}>
          {signUp.isPending ? t.submitting : t.submit}
        </Button>
      </form>
    </Card>
  );
}
