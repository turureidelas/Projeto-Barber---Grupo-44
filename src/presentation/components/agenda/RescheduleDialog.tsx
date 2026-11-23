import type { AppointmentDTO } from '@application/dto/agenda';
import type { ProfessionalDTO } from '@application/dto/catalog';
import { formatDateTime, isoToLocalDate } from '@shared/format';
import { useId, useState } from 'react';
import { useAvailableSlots } from '../../hooks/useAgenda';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/fields';
import { Modal } from '../ui/Modal';
import { SlotPicker } from './SlotPicker';

const t = ptBR.reschedule;

interface RescheduleDialogProps {
  readonly appointment: AppointmentDTO | null;
  readonly today: string;
  /** When the user may move the client to another professional. */
  readonly professionals: readonly ProfessionalDTO[] | null;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (values: { start: string; professionalId: string }) => void;
}

export function RescheduleDialog({
  appointment,
  today,
  professionals,
  pending,
  onClose,
  onConfirm,
}: RescheduleDialogProps) {
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
            {ptBR.common.cancel}
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {t.submit}
          </Button>
        </>
      }
    >
      {appointment && (
        <RescheduleForm
          formId={formId}
          appointment={appointment}
          today={today}
          professionals={professionals}
          onConfirm={onConfirm}
        />
      )}
    </Modal>
  );
}

interface RescheduleFormProps {
  readonly formId: string;
  readonly appointment: AppointmentDTO;
  readonly today: string;
  readonly professionals: readonly ProfessionalDTO[] | null;
  readonly onConfirm: (values: { start: string; professionalId: string }) => void;
}

function RescheduleForm({
  formId,
  appointment,
  today,
  professionals,
  onConfirm,
}: RescheduleFormProps) {
  const originalDate = isoToLocalDate(appointment.start);
  const [date, setDate] = useState(originalDate < today ? today : originalDate);
  const [professionalId, setProfessionalId] = useState(appointment.professionalId);
  const [slot, setSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  const slots = useAvailableSlots({
    professionalId,
    serviceId: appointment.serviceId,
    date,
    ignoreAppointmentId: appointment.id,
  });

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!slot) {
          setError(ptBR.slots.choose);
          return;
        }
        onConfirm({ start: slot, professionalId });
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t.date}
          type="date"
          min={today}
          value={date}
          onChange={(event) => {
            if (event.target.value) setDate(event.target.value);
            setSlot(null);
          }}
        />
        {professionals && professionals.length > 1 && (
          <SelectField
            label={t.professional}
            value={professionalId}
            options={professionals.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(event) => {
              setProfessionalId(event.target.value);
              setSlot(null);
            }}
          />
        )}
      </div>
      <SlotPicker
        slots={slots.data}
        loading={slots.isPending}
        selected={slot}
        error={error}
        onSelect={(start) => {
          setSlot(start);
          setError(undefined);
        }}
      />
    </form>
  );
}
