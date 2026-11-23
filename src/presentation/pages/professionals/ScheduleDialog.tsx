import type { ProfessionalDetailsDTO, WorkDayDTO } from '@application/dto/catalog';
import { Info } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { CheckboxField, SelectField } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { TIME_OPTIONS } from '../../components/ui/time-options';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.team;

/** Monday first, Sunday last (how barbers think about the week). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const BREAK_OPTIONS = [{ value: '', label: t.noBreak }, ...TIME_OPTIONS];

interface DayRow {
  readonly weekday: number;
  readonly works: boolean;
  readonly start: string;
  readonly end: string;
  readonly breakStart: string;
  readonly breakEnd: string;
}

function rowsFrom(schedule: readonly WorkDayDTO[]): DayRow[] {
  return WEEK_ORDER.map((weekday) => {
    const day = schedule.find((candidate) => candidate.weekday === weekday);
    const pause = day?.breaks[0];
    return {
      weekday,
      works: day !== undefined,
      start: day?.start ?? '09:00',
      end: day?.end ?? '18:00',
      breakStart: pause?.start ?? '',
      breakEnd: pause?.end ?? '',
    };
  });
}

/** Friendly check before sending (the domain validates again). */
function rowError(row: DayRow): string | null {
  if (!row.works) return null;
  if (row.end <= row.start) return t.endBeforeStart;
  if ((row.breakStart === '') !== (row.breakEnd === '')) return t.breakIncomplete;
  if (row.breakStart !== '') {
    const inside =
      row.breakStart >= row.start && row.breakEnd <= row.end && row.breakStart < row.breakEnd;
    if (!inside) return t.breakOutside;
  }
  return null;
}

function toDTO(rows: readonly DayRow[]): WorkDayDTO[] {
  return rows
    .filter((row) => row.works)
    .map((row) => ({
      weekday: row.weekday,
      start: row.start,
      end: row.end,
      breaks: row.breakStart ? [{ start: row.breakStart, end: row.breakEnd }] : [],
    }));
}

interface ScheduleDialogProps {
  readonly professional: ProfessionalDetailsDTO | null;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (schedule: WorkDayDTO[]) => void;
}

/** Weekly hours ("escala"): which days, from/to, and an optional break. */
export function ScheduleDialog({ professional, pending, onClose, onSubmit }: ScheduleDialogProps) {
  const formId = useId();
  return (
    <Modal
      open={professional !== null}
      onClose={onClose}
      title={professional ? t.scheduleTitle(professional.name) : ''}
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
      {professional && (
        <ScheduleForm formId={formId} schedule={professional.schedule} onSubmit={onSubmit} />
      )}
    </Modal>
  );
}

interface ScheduleFormProps {
  readonly formId: string;
  readonly schedule: readonly WorkDayDTO[];
  readonly onSubmit: (schedule: WorkDayDTO[]) => void;
}

function ScheduleForm({ formId, schedule, onSubmit }: ScheduleFormProps) {
  const [rows, setRows] = useState(() => rowsFrom(schedule));
  const [showErrors, setShowErrors] = useState(false);

  const update = (weekday: number, changes: Partial<DayRow>) => {
    setRows((current) =>
      current.map((row) => (row.weekday === weekday ? { ...row, ...changes } : row)),
    );
  };

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (rows.some((row) => rowError(row) !== null)) {
          setShowErrors(true);
          return;
        }
        onSubmit(toDTO(rows));
      }}
      className="flex flex-col gap-3"
    >
      <p className="flex gap-2 text-sm text-fg-muted">
        <Info aria-hidden="true" className="size-4 shrink-0" />
        {t.scheduleHint}
      </p>
      {rows.map((row) => {
        const name = t.weekdays[row.weekday] ?? '';
        const error = showErrors ? rowError(row) : null;
        return (
          <fieldset key={row.weekday} className="rounded-xl border border-line p-3">
            <legend className="sr-only">{name}</legend>
            <CheckboxField
              label={`${name} · ${t.works}`}
              checked={row.works}
              onChange={(event) => {
                update(row.weekday, { works: event.target.checked });
              }}
            />
            {row.works && (
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SelectField
                  label={t.start}
                  value={row.start}
                  options={TIME_OPTIONS}
                  onChange={(event) => {
                    update(row.weekday, { start: event.target.value });
                  }}
                />
                <SelectField
                  label={t.end}
                  value={row.end}
                  options={TIME_OPTIONS}
                  onChange={(event) => {
                    update(row.weekday, { end: event.target.value });
                  }}
                />
                <SelectField
                  label={t.breakStart}
                  value={row.breakStart}
                  options={BREAK_OPTIONS}
                  onChange={(event) => {
                    update(row.weekday, { breakStart: event.target.value });
                  }}
                />
                <SelectField
                  label={t.breakEnd}
                  value={row.breakEnd}
                  options={BREAK_OPTIONS}
                  onChange={(event) => {
                    update(row.weekday, { breakEnd: event.target.value });
                  }}
                />
              </div>
            )}
            {error && (
              <p role="alert" className="mt-2 text-sm font-medium text-danger">
                {error}
              </p>
            )}
          </fieldset>
        );
      })}
    </form>
  );
}
