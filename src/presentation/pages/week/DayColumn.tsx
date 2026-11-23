import type { AgendaDayDTO, AppointmentDTO, TimeBlockDTO } from '@application/dto/agenda';
import { formatLongDate, formatShortDate, formatTime, formatWeekdayShort } from '@shared/format';
import { Lock } from 'lucide-react';
import { useId } from 'react';
import { StatusBadge } from '../../components/agenda/StatusBadge';
import { mergeTimeline } from '../../components/agenda/timeline';
import { cx } from '../../components/ui/cx';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.week;

interface DayColumnProps {
  readonly day: AgendaDayDTO;
  readonly isToday: boolean;
  /** On phones only the selected day is shown; on wide screens all seven are. */
  readonly hiddenOnPhone: boolean;
  readonly onOpenAppointment: (appointment: AppointmentDTO) => void;
  /** null = the user may not free blocked times of this professional. */
  readonly onOpenBlock: ((block: TimeBlockDTO) => void) | null;
}

export function DayColumn({
  day,
  isToday,
  hiddenOnPhone,
  onOpenAppointment,
  onOpenBlock,
}: DayColumnProps) {
  const headingId = useId();
  const entries = mergeTimeline(day.appointments, day.timeBlocks);
  const hours = day.workingHours.map((window) => `${window.start}–${window.end}`).join(' · ');

  return (
    <section
      aria-labelledby={headingId}
      className={cx(
        'min-w-0 flex-col gap-2 rounded-card border bg-surface p-2',
        isToday ? 'border-accent/60' : 'border-line',
        hiddenOnPhone ? 'hidden lg:flex' : 'flex',
      )}
    >
      <header className="px-1 pt-1">
        <h2 id={headingId} className="flex items-baseline gap-2">
          <span className="sr-only">{formatLongDate(day.date)}</span>
          <span aria-hidden="true" className="text-lg font-bold capitalize">
            {formatWeekdayShort(day.date)} {formatShortDate(day.date)}
          </span>
          {isToday && (
            <span className="rounded-full bg-accent px-2 text-xs font-bold text-accent-fg">
              {t.today}
            </span>
          )}
        </h2>
        <p className="text-xs text-fg-muted">{hours || t.dayOff}</p>
      </header>

      {entries.length === 0 ? (
        <p className="px-1 pb-2 text-sm text-fg-muted">{t.empty}</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {entries.map((entry) =>
            entry.kind === 'appointment' ? (
              <li key={entry.item.id}>
                <AppointmentCard appointment={entry.item} onOpen={onOpenAppointment} />
              </li>
            ) : (
              <li key={entry.item.id}>
                <BlockCard block={entry.item} onOpen={onOpenBlock} />
              </li>
            ),
          )}
        </ol>
      )}
    </section>
  );
}

function AppointmentCard({
  appointment,
  onOpen,
}: {
  readonly appointment: AppointmentDTO;
  readonly onOpen: (appointment: AppointmentDTO) => void;
}) {
  const inactive = appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW';
  return (
    <button
      type="button"
      onClick={() => {
        onOpen(appointment);
      }}
      className={cx(
        'flex min-h-11 w-full flex-col gap-1 rounded-xl border border-line bg-surface-2 p-2 text-left transition-colors hover:border-line-strong hover:bg-surface-3',
        inactive && 'opacity-60',
      )}
    >
      <span className="flex flex-wrap items-center justify-between gap-1">
        <span className="font-bold tabular-nums">{formatTime(appointment.start)}</span>
        <StatusBadge status={appointment.status} />
      </span>
      <span
        className={cx(
          'truncate font-semibold',
          appointment.status === 'CANCELLED' && 'line-through',
        )}
      >
        {appointment.clientName}
      </span>
      <span className="truncate text-sm text-fg-muted">{appointment.serviceName}</span>
    </button>
  );
}

function BlockCard({
  block,
  onOpen,
}: {
  readonly block: TimeBlockDTO;
  readonly onOpen: ((block: TimeBlockDTO) => void) | null;
}) {
  const content = (
    <>
      <Lock aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0">
        <span className="font-semibold text-fg">
          {t.blockedSlot(`${formatTime(block.start)}–${formatTime(block.end)}`)}
        </span>
        {block.reason && <span className="block truncate text-sm">{block.reason}</span>}
      </span>
    </>
  );
  const classes =
    'flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed border-line-strong p-2 text-left text-fg-muted';

  if (!onOpen) {
    return <div className={classes}>{content}</div>;
  }
  return (
    <button
      type="button"
      onClick={() => {
        onOpen(block);
      }}
      className={cx(classes, 'hover:bg-surface-2')}
    >
      {content}
    </button>
  );
}
