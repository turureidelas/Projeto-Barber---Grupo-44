import type { BarbershopDTO } from '@application/dto/catalog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ClientSimulator } from '../../components/demo/ClientSimulator';
import { ResetDemoButton } from '../../components/demo/ResetDemoButton';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextField } from '../../components/ui/fields';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/states';
import { useIsDemo } from '../../hooks/useDemo';
import { useBarbershop, useSettingsMutations } from '../../hooks/useSettings';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.settings;

/** Owner only: barbershop details, cancellation policy and (demo) the client simulator. */
export function SettingsPage() {
  const barbershop = useBarbershop();
  const isDemo = useIsDemo();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.title} subtitle={t.subtitle} />
      {barbershop.isPending ? (
        <LoadingState />
      ) : barbershop.isError ? (
        <ErrorState
          message={errorMessage(barbershop.error)}
          onRetry={() => void barbershop.refetch()}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <BarbershopForm barbershop={barbershop.data} />
          <PolicyForm barbershop={barbershop.data} />
          {isDemo && (
            <Section title={ptBR.simulator.demoTitle}>
              <ClientSimulator minNoticeHours={barbershop.data.cancellationPolicy.minNoticeHours} />
              <div className="mt-5 border-t border-line pt-4 sm:max-w-xs">
                <ResetDemoButton variant="secondary" />
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}) {
  const id = useId();
  return (
    <Card>
      <section aria-labelledby={id}>
        <h2 id={id} className="text-lg font-bold">
          {title}
        </h2>
        {description && <p className="mt-1 text-fg-muted">{description}</p>}
        <div className="mt-4">{children}</div>
      </section>
    </Card>
  );
}

const shopSchema = z.object({
  name: z.string().trim().min(1, t.nameRequired).max(80),
  phone: z
    .string()
    .trim()
    .refine((value) => [10, 11, 12, 13].includes(value.replace(/\D/g, '').length), t.phoneInvalid),
  address: z.string().trim().max(200),
});

type ShopValues = z.infer<typeof shopSchema>;

function BarbershopForm({ barbershop }: { readonly barbershop: BarbershopDTO }) {
  const { updateBarbershop } = useSettingsMutations();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShopValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: barbershop.name,
      phone: barbershop.phone,
      address: barbershop.address ?? '',
    },
  });

  const submit = handleSubmit((values) => {
    updateBarbershop.mutate({
      name: values.name,
      phone: values.phone,
      address: values.address === '' ? null : values.address,
    });
  });

  return (
    <Section title={t.shopTitle}>
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <TextField
          label={t.shopName}
          autoComplete="organization"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label={t.shopPhone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <TextField
          label={t.shopAddress}
          hint={t.shopAddressHint}
          autoComplete="street-address"
          error={errors.address?.message}
          {...register('address')}
        />
        <Button type="submit" className="self-start" loading={updateBarbershop.isPending}>
          {t.save}
        </Button>
      </form>
    </Section>
  );
}

const wholeNumber = (max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, message)
    .refine((value) => Number(value) <= max, message);

const policySchema = z.object({
  minNoticeHours: wholeNumber(168, t.minNoticeInvalid),
  noShowToleranceMinutes: wholeNumber(120, t.noShowToleranceInvalid),
});

type PolicyValues = z.infer<typeof policySchema>;

function PolicyForm({ barbershop }: { readonly barbershop: BarbershopDTO }) {
  const { updatePolicy } = useSettingsMutations();
  const { minNoticeHours, noShowToleranceMinutes } = barbershop.cancellationPolicy;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PolicyValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      minNoticeHours: String(minNoticeHours),
      noShowToleranceMinutes: String(noShowToleranceMinutes),
    },
  });

  const submit = handleSubmit((values) => {
    updatePolicy.mutate({
      minNoticeHours: Number(values.minNoticeHours),
      noShowToleranceMinutes: Number(values.noShowToleranceMinutes),
    });
  });

  return (
    <Section title={t.policyTitle} description={t.policyBody}>
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <TextField
          label={t.minNotice}
          hint={t.minNoticeHint}
          inputMode="numeric"
          error={errors.minNoticeHours?.message}
          {...register('minNoticeHours')}
        />
        <TextField
          label={t.noShowTolerance}
          hint={t.noShowToleranceHint}
          inputMode="numeric"
          error={errors.noShowToleranceMinutes?.message}
          {...register('noShowToleranceMinutes')}
        />
        <Button type="submit" className="self-start" loading={updatePolicy.isPending}>
          {t.save}
        </Button>
      </form>
    </Section>
  );
}
