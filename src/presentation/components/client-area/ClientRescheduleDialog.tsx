import type { AppointmentDTO } from '@application/dto/agenda';
import { isoToLocalDate } from '@shared/format';
import { useState } from 'react';
import { useClientSlots } from '../../hooks/useClientArea';
import { ptBR } from '../../i18n/pt-BR';
import { SlotPicker } from '../agenda/SlotPicker';
import { Button } from '../ui/Button';
import { TextField } from '../ui/fields';
import { Modal } from '../ui/Modal';

const t = ptBR.clientArea.home;

interface ClientRescheduleDialogProps {
  readonly appointment: AppointmentDTO | null;
  readonly today: string;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (start: string) => void;
}

/** Same service and professional, another free time (the engine lists only valid ones). */
export function ClientRescheduleDialog({
  appointment,
  today,
  pending,
  onClose,
  onConfirm,
}: ClientRescheduleDialogProps) {
  return (
    <Modal
      open={appointment !== null}
      onClose={onClose}
      title={t.rescheduleTitle}
      {...(appointment && {
        description: t.rescheduleDescription(appointment.serviceName, appointment.professionalName),
      })}
    >
      {appointment && (
        // Keyed so each appointment starts with its own day and no chosen time.
        <RescheduleForm
          key={appointment.id}
          appointment={appointment}
          today={today}
          pending={pending}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      )}
    </Modal>
  );
}

function RescheduleForm({
  appointment,
  today,
  pending,
  onClose,
  onConfirm,
}: Omit<ClientRescheduleDialogProps, 'appointment'> & { readonly appointment: AppointmentDTO }) {
  const [date, setDate] = useState(() => {
    const current = isoToLocalDate(appointment.start);
    return current < today ? today : current;
  });
  const [start, setStart] = useState<string | null>(null);
  const slots = useClientSlots({
    professionalId: appointment.professionalId,
    serviceId: appointment.serviceId,
    date,
    ignoreAppointmentId: appointment.id,
  });
  const choices = slots.data?.filter((slot) => slot.start !== appointment.start);

  return (
    <div className="flex flex-col gap-4">
      <TextField
        type="date"
        label={t.rescheduleDate}
        min={today}
        value={date}
        onChange={(event) => {
          if (!event.target.value) return;
          setDate(event.target.value);
          setStart(null);
        }}
      />
      <SlotPicker slots={choices} loading={slots.isPending} selected={start} onSelect={setStart} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {ptBR.common.cancel}
        </Button>
        <Button
          disabled={start === null}
          loading={pending}
          onClick={() => {
            if (start) onConfirm(start);
          }}
        >
          {t.rescheduleSubmit}
        </Button>
      </div>
    </div>
  );
}
