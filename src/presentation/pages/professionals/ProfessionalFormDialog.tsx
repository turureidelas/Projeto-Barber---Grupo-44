import type { ProfessionalDetailsDTO } from '@application/dto/catalog';
import type { ProfessionalInput } from '@application/use-cases';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.team;

const schema = z.object({
  name: z.string().trim().min(1, ptBR.catalog.nameRequired).max(80),
  specialty: z.string().trim().max(80),
  photoUrl: z.union([z.literal(''), z.url({ protocol: /^https$/, error: t.photoUrlInvalid })]),
  commission: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, t.commissionInvalid)
    .refine((value) => Number(value) <= 100, t.commissionInvalid),
});

type FormValues = z.infer<typeof schema>;

interface ProfessionalFormDialogProps {
  readonly open: boolean;
  /** null = new professional. */
  readonly professional: ProfessionalDetailsDTO | null;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (input: ProfessionalInput) => void;
}

export function ProfessionalFormDialog({
  open,
  professional,
  pending,
  onClose,
  onSubmit,
}: ProfessionalFormDialogProps) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={professional ? t.formEdit : t.formNew}
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
      {open && <ProfessionalForm formId={formId} professional={professional} onSubmit={onSubmit} />}
    </Modal>
  );
}

interface ProfessionalFormProps {
  readonly formId: string;
  readonly professional: ProfessionalDetailsDTO | null;
  readonly onSubmit: (input: ProfessionalInput) => void;
}

function ProfessionalForm({ formId, professional, onSubmit }: ProfessionalFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: professional?.name ?? '',
      specialty: professional?.specialty ?? '',
      photoUrl: professional?.photoUrl ?? '',
      commission: String(professional?.commissionPercent ?? 40),
    },
  });

  const submit = handleSubmit((values) => {
    onSubmit({
      name: values.name,
      specialty: values.specialty === '' ? null : values.specialty,
      photoUrl: values.photoUrl === '' ? null : values.photoUrl,
      commissionPercent: Number(values.commission),
    });
  });

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
    >
      <TextField
        label={t.name}
        autoComplete="off"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField label={t.specialty} autoComplete="off" {...register('specialty')} />
      <TextField
        label={t.commissionLabel}
        hint={t.commissionHint}
        inputMode="numeric"
        error={errors.commission?.message}
        {...register('commission')}
      />
      <TextField
        label={t.photoUrl}
        type="url"
        inputMode="url"
        error={errors.photoUrl?.message}
        {...register('photoUrl')}
      />
    </form>
  );
}
