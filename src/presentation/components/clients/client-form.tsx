import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from '../ui/Button';
import { CheckboxField, TextField } from '../ui/fields';
import { clientSchema, type ClientFormValues } from './client-form-schema';

const t = ptBR.clients;

interface ClientFieldsProps {
  readonly register: UseFormRegister<ClientFormValues>;
  readonly errors: FieldErrors<ClientFormValues>;
  readonly withConsent: boolean;
  readonly withEmail?: boolean;
}

/** Only what is needed (LGPD): name and phone; e-mail optional. */
export function ClientFields({
  register,
  errors,
  withConsent,
  withEmail = true,
}: ClientFieldsProps) {
  return (
    <>
      <TextField
        label={t.name}
        autoComplete="off"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label={t.phoneLabel}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        error={errors.phone?.message}
        {...register('phone')}
      />
      {withEmail && (
        <TextField
          label={t.emailOptional}
          type="email"
          inputMode="email"
          autoComplete="off"
          error={errors.email?.message}
          {...register('email')}
        />
      )}
      {withConsent && (
        <CheckboxField label={t.consent} error={errors.consent?.message} {...register('consent')} />
      )}
    </>
  );
}

interface QuickClientFormProps {
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (values: ClientFormValues) => void;
}

/**
 * Inline registration inside another form (e.g. "Novo agendamento"). Not a <form> itself —
 * nested forms are invalid HTML — so the button validates and submits by hand.
 */
export function QuickClientForm({ pending, onCancel, onSubmit }: QuickClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema(true)),
    defaultValues: { name: '', phone: '', email: '', consent: false },
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line-strong p-3">
      <ClientFields register={register} errors={errors} withConsent withEmail={false} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {ptBR.common.cancel}
        </Button>
        <Button
          loading={pending}
          onClick={() => {
            void handleSubmit(onSubmit)();
          }}
        >
          {t.saveClient}
        </Button>
      </div>
    </div>
  );
}
