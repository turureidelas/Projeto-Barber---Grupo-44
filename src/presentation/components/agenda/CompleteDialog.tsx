import type { AppointmentDTO } from '@application/dto/agenda';
import { PAYMENT_METHODS, type PaymentMethod } from '@domain/entities/Appointment';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatMoney } from '@shared/format';
import { formatMoneyInput, parseMoneyInput } from '@shared/money';
import { Banknote, CreditCard, QrCode, Wallet, type LucideIcon } from 'lucide-react';
import { useEffect, useId } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { TextField } from '../ui/fields';
import { Modal } from '../ui/Modal';

const t = ptBR.complete;

const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = {
  PIX: QrCode,
  CASH: Banknote,
  DEBIT_CARD: Wallet,
  CREDIT_CARD: CreditCard,
};
/** Most used first. */
const METHOD_ORDER: readonly PaymentMethod[] = ['PIX', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD'];

const schema = z.object({
  amount: z.string().refine((value) => parseMoneyInput(value) !== null, t.amountInvalid),
  method: z.enum(PAYMENT_METHODS),
});

type FormValues = z.infer<typeof schema>;

interface CompleteDialogProps {
  /** The appointment being completed; null keeps the dialog closed. */
  readonly appointment: AppointmentDTO | null;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (values: { amountPaidCents: number; paymentMethod: PaymentMethod }) => void;
}

/** "Concluir atendimento": amount pre-filled with the price, Pix pre-selected — usually 1 tap. */
export function CompleteDialog({ appointment, pending, onClose, onConfirm }: CompleteDialogProps) {
  const formId = useId();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', method: 'PIX' },
  });
  const selected = useWatch({ control, name: 'method' });

  useEffect(() => {
    if (appointment) {
      reset({ amount: formatMoneyInput(appointment.priceCents), method: 'PIX' });
    }
  }, [appointment, reset]);

  const submit = handleSubmit((values) => {
    const cents = parseMoneyInput(values.amount);
    if (cents !== null) {
      onConfirm({ amountPaidCents: cents, paymentMethod: values.method });
    }
  });

  return (
    <Modal
      open={appointment !== null}
      onClose={onClose}
      title={t.title}
      {...(appointment && {
        description: t.description(appointment.clientName, appointment.serviceName),
      })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {ptBR.common.cancel}
          </Button>
          <Button type="submit" form={formId} size="lg" loading={pending}>
            {t.submit}
          </Button>
        </>
      }
    >
      {appointment && (
        <form
          id={formId}
          noValidate
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-5"
        >
          <TextField
            label={t.amount}
            inputMode="decimal"
            autoComplete="off"
            hint={t.amountHint(formatMoney(appointment.priceCents))}
            error={errors.amount?.message}
            className="text-2xl font-bold"
            {...register('amount')}
          />
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t.method}</legend>
            <div className="grid grid-cols-2 gap-2">
              {METHOD_ORDER.map((method) => {
                const Icon = METHOD_ICONS[method];
                return (
                  <label
                    key={method}
                    className={cx(
                      'flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border px-3 font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent',
                      selected === method
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-line-strong bg-surface-2 hover:bg-surface-3',
                    )}
                  >
                    <input
                      type="radio"
                      value={method}
                      className="sr-only"
                      {...register('method')}
                    />
                    <Icon aria-hidden="true" className="size-5" />
                    {ptBR.paymentMethods[method]}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}
