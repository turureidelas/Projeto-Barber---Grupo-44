import { localDateTimeToIso } from '@shared/format';
import { useId, useState } from 'react';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from '../ui/Button';
import { SelectField, TextAreaField, TextField } from '../ui/fields';
import { Modal } from '../ui/Modal';

const t = ptBR.block;

/** 06:00 … 23:45 every 15 minutes, plus 24:00 as an end. */
const TIMES = Array.from({ length: (24 - 6) * 4 + 1 }, (_, index) => {
  const minutes = 6 * 60 + index * 15;
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
});
const TIME_OPTIONS = TIMES.map((time) => ({ value: time, label: time }));

export interface BlockTimeValues {
  readonly start: string;
  readonly end: string;
  readonly reason: string | null;
}

interface BlockTimeDialogProps {
  readonly open: boolean;
  readonly professionalName: string;
  readonly defaultDate: string;
  readonly today: string;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (values: BlockTimeValues) => void;
}

/** "Bloquear horário" — a day and a time range (with an optional note). */
export function BlockTimeDialog({
  open,
  professionalName,
  defaultDate,
  today,
  pending,
  onClose,
  onConfirm,
}: BlockTimeDialogProps) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.title}
      description={t.description(professionalName)}
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
      {open && (
        <BlockTimeForm
          formId={formId}
          defaultDate={defaultDate < today ? today : defaultDate}
          today={today}
          onConfirm={onConfirm}
        />
      )}
    </Modal>
  );
}

interface BlockTimeFormProps {
  readonly formId: string;
  readonly defaultDate: string;
  readonly today: string;
  readonly onConfirm: (values: BlockTimeValues) => void;
}

function BlockTimeForm({ formId, defaultDate, today, onConfirm }: BlockTimeFormProps) {
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState('12:00');
  const [end, setEnd] = useState('13:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (end <= start) {
          setError(t.endBeforeStart);
          return;
        }
        const note = reason.trim();
        onConfirm({
          start: localDateTimeToIso(date, start),
          end: localDateTimeToIso(date, end),
          reason: note === '' ? null : note,
        });
      }}
      className="flex flex-col gap-4"
    >
      <TextField
        label={t.date}
        type="date"
        min={today}
        value={date}
        onChange={(event) => {
          if (event.target.value) setDate(event.target.value);
        }}
      />
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label={t.start}
          value={start}
          options={TIME_OPTIONS}
          onChange={(event) => {
            setStart(event.target.value);
            setError(undefined);
          }}
        />
        <SelectField
          label={t.end}
          value={end}
          options={TIME_OPTIONS}
          error={error}
          onChange={(event) => {
            setEnd(event.target.value);
            setError(undefined);
          }}
        />
      </div>
      <TextAreaField
        label={t.reason}
        hint={t.reasonHint}
        value={reason}
        maxLength={120}
        rows={2}
        onChange={(event) => {
          setReason(event.target.value);
        }}
      />
    </form>
  );
}
