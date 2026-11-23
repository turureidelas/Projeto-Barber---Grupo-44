import type { AppointmentDTO } from '@application/dto/agenda';
import { formatDateTime, formatTime } from '@shared/format';
import { TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from '../ui/Button';
import { TextAreaField } from '../ui/fields';
import { Modal } from '../ui/Modal';

const t = ptBR.cancel;

interface CancelDialogProps {
  readonly appointment: AppointmentDTO | null;
  readonly now: Date;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (reason: string | null) => void;
}

/**
 * Staff may cancel at any time, but after the policy deadline ("em cima da hora") the reason
 * is required. The deadline comes from the server (changeDeadline) — no rule duplicated here.
 */
export function CancelDialog({ appointment, now, pending, onClose, onConfirm }: CancelDialogProps) {
  const formId = useId();
  return (
    <Modal
      open={appointment !== null}
      onClose={onClose}
      title={t.title}
      {...(appointment && {
        description: t.description(appointment.clientName, formatDateTime(appointment.start)),
      })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t.keep}
          </Button>
          <Button type="submit" form={formId} variant="danger" loading={pending}>
            {t.submit}
          </Button>
        </>
      }
    >
      {appointment && (
        <CancelForm formId={formId} appointment={appointment} now={now} onConfirm={onConfirm} />
      )}
    </Modal>
  );
}

interface CancelFormProps {
  readonly formId: string;
  readonly appointment: AppointmentDTO;
  readonly now: Date;
  readonly onConfirm: (reason: string | null) => void;
}

function CancelForm({ formId, appointment, now, onConfirm }: CancelFormProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const late = now.getTime() > Date.parse(appointment.changeDeadline);

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = reason.trim();
        if (late && trimmed === '') {
          setError(t.reasonRequired);
          return;
        }
        onConfirm(trimmed === '' ? null : trimmed);
      }}
      className="flex flex-col gap-4"
    >
      {late && (
        <p className="flex gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-warning">
          <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
          {t.lateWarning(formatTime(appointment.changeDeadline))}
        </p>
      )}
      <TextAreaField
        label={late ? t.reason : t.reasonOptional}
        hint={t.reasonHint}
        value={reason}
        maxLength={200}
        required={late}
        error={error}
        onChange={(event) => {
          setReason(event.target.value);
          setError(undefined);
        }}
      />
    </form>
  );
}
