import type { ServiceDTO } from '@application/dto/catalog';
import type { ServiceInput } from '@application/use-cases';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatMoney } from '@shared/format';
import { formatMoneyInput, parseMoneyInput } from '@shared/money';
import { useId } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { CheckboxField, SelectField, TextField } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { DURATION_OPTIONS } from '../../components/ui/time-options';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.services;

export type ServiceFormMode =
  | { readonly kind: 'new-single' }
  | { readonly kind: 'new-combo' }
  | { readonly kind: 'edit'; readonly service: ServiceDTO };

function schemaFor(isCombo: boolean) {
  return z.object({
    name: z.string().trim().min(1, ptBR.catalog.nameRequired).max(60),
    duration: z.string(),
    price: z.string().refine((value) => parseMoneyInput(value) !== null, t.priceInvalid),
    items: isCombo ? z.array(z.string()).min(2, t.itemsMin) : z.array(z.string()),
  });
}

type FormValues = z.infer<ReturnType<typeof schemaFor>>;

interface ServiceFormDialogProps {
  readonly mode: ServiceFormMode | null;
  /** Active single services, to compose combos. */
  readonly singles: readonly ServiceDTO[];
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (input: ServiceInput) => void;
}

export function ServiceFormDialog({
  mode,
  singles,
  pending,
  onClose,
  onSubmit,
}: ServiceFormDialogProps) {
  const formId = useId();
  const title =
    mode?.kind === 'new-combo'
      ? t.formNewCombo
      : mode?.kind === 'edit'
        ? t.formEdit
        : t.formNewService;
  return (
    <Modal
      open={mode !== null}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {ptBR.common.cancel}
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {ptBR.catalog.save}
          </Button>
        </>
      }
    >
      {mode && <ServiceForm formId={formId} mode={mode} singles={singles} onSubmit={onSubmit} />}
    </Modal>
  );
}

interface ServiceFormProps {
  readonly formId: string;
  readonly mode: ServiceFormMode;
  readonly singles: readonly ServiceDTO[];
  readonly onSubmit: (input: ServiceInput) => void;
}

function ServiceForm({ formId, mode, singles, onSubmit }: ServiceFormProps) {
  const editing = mode.kind === 'edit' ? mode.service : null;
  const isCombo = mode.kind === 'new-combo' || editing?.kind === 'COMBO';
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schemaFor(isCombo)),
    defaultValues: {
      name: editing?.name ?? '',
      duration: String(editing?.durationMinutes ?? 30),
      price: editing ? formatMoneyInput(editing.priceCents) : '',
      items: editing ? [...editing.includedServiceIds] : [],
    },
  });
  const chosen = useWatch({ control, name: 'items' });
  const separateTotal = singles
    .filter((single) => chosen.includes(single.id))
    .reduce((sum, single) => sum + single.priceCents, 0);

  const submit = handleSubmit((values) => {
    onSubmit({
      name: values.name,
      durationMinutes: Number(values.duration),
      priceCents: parseMoneyInput(values.price) ?? 0,
      includedServiceIds: isCombo ? values.items : [],
    });
  });

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
    >
      {isCombo && <p className="text-fg-muted">{t.comboHint}</p>}
      <TextField
        label={t.name}
        autoComplete="off"
        error={errors.name?.message}
        {...register('name')}
      />
      <div className="grid grid-cols-2 gap-4">
        <SelectField label={t.duration} options={DURATION_OPTIONS} {...register('duration')} />
        <TextField
          label={t.priceLabel}
          inputMode="decimal"
          autoComplete="off"
          error={errors.price?.message}
          {...register('price')}
        />
      </div>
      {isCombo && (
        <fieldset>
          <legend className="mb-1 text-sm font-semibold">{t.items}</legend>
          {singles.map((single) => (
            <CheckboxField
              key={single.id}
              value={single.id}
              label={`${single.name} · ${formatMoney(single.priceCents)}`}
              {...register('items')}
            />
          ))}
          {errors.items?.message && (
            <p role="alert" className="text-sm font-medium text-danger">
              {errors.items.message}
            </p>
          )}
          {chosen.length > 0 && (
            <p className="mt-2 text-sm text-fg-muted">
              {t.separatePrice(formatMoney(separateTotal))}
            </p>
          )}
        </fieldset>
      )}
    </form>
  );
}
