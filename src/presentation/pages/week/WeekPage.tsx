import type { AppointmentDTO, TimeBlockDTO, WeeklyAgendaDTO } from '@application/dto/agenda';
import {
  addDaysToLocalDate,
  formatShortDate,
  formatTime,
  formatWeekdayShort,
  isLocalDateString,
  isoToLocalDate,
  startOfWeek,
} from '@shared/format';
import { CalendarPlus, Lock } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { AppointmentDetailsDialog } from '../../components/agenda/AppointmentDetailsDialog';
import { BlockTimeDialog } from '../../components/agenda/BlockTimeDialog';
import { CancelDialog } from '../../components/agenda/CancelDialog';
import { PeriodNavigator, ProfessionalFilter } from '../../components/agenda/filters';
import { NewAppointmentDialog } from '../../components/agenda/NewAppointmentDialog';
import { RescheduleDialog } from '../../components/agenda/RescheduleDialog';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { cx } from '../../components/ui/cx';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/states';
import { useAgendaManagement, useWeeklyAgenda } from '../../hooks/useAgenda';
import { useProfessionals } from '../../hooks/useCatalog';
import { useNow, useToday } from '../../hooks/useNow';
import { useCurrentUser } from '../../hooks/useSession';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';
import { DayColumn } from './DayColumn';

const t = ptBR.week;
const WEEK_PARAM = 'semana';
const DAY_PARAM = 'dia';
const PROFESSIONAL_PARAM = 'profissional';

type Dialog =
  | { readonly kind: 'none' }
  | { readonly kind: 'details' | 'reschedule' | 'cancel'; readonly appointment: AppointmentDTO }
  | { readonly kind: 'unblock'; readonly block: TimeBlockDTO }
  | { readonly kind: 'block' | 'new' };

const CLOSED: Dialog = { kind: 'none' };

/** One professional's week: confirm, reschedule, cancel, book and block times. */
export function WeekPage() {
  const user = useCurrentUser();
  const today = useToday();
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const management = useAgendaManagement();
  const [dialog, setDialog] = useState<Dialog>(CLOSED);

  const seesEveryone = user.permissions.includes('agenda:manage-all');
  const professionals = useProfessionals();
  const bookable = (professionals.data ?? []).filter(
    (professional) => seesEveryone || professional.id === user.professionalId,
  );

  const weekParam = params.get(WEEK_PARAM);
  const thisWeek = startOfWeek(today);
  const startDate = weekParam && isLocalDateString(weekParam) ? startOfWeek(weekParam) : thisWeek;
  const professionalId = seesEveryone
    ? (params.get(PROFESSIONAL_PARAM) ?? user.professionalId ?? bookable[0]?.id ?? null)
    : user.professionalId;
  const week = useWeeklyAgenda(startDate, professionalId);

  const weekDates = Array.from({ length: 7 }, (_, offset) => addDaysToLocalDate(startDate, offset));
  const dayParam = params.get(DAY_PARAM);
  const selectedDay =
    dayParam && weekDates.includes(dayParam)
      ? dayParam
      : weekDates.includes(today)
        ? today
        : startDate;

  const canBlock =
    user.permissions.includes('time-blocks:manage-all') ||
    (user.permissions.includes('time-blocks:manage-own') && professionalId === user.professionalId);

  const setParam = (changes: Record<string, string | null>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };
  const goToWeek = (start: string) => {
    setParam({ [WEEK_PARAM]: start === thisWeek ? null : start, [DAY_PARAM]: null });
  };
  const close = () => {
    setDialog(CLOSED);
  };
  const professionalName = week.data?.professional.name ?? '';

  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.range(
          formatShortDate(startDate),
          formatShortDate(addDaysToLocalDate(startDate, 6)),
        )}
        actions={
          <PeriodNavigator
            label={t.weekNavigation}
            previousLabel={t.previousWeek}
            nextLabel={t.nextWeek}
            currentLabel={t.thisWeek}
            isCurrent={startDate === thisWeek}
            onPrevious={() => {
              goToWeek(addDaysToLocalDate(startDate, -7));
            }}
            onNext={() => {
              goToWeek(addDaysToLocalDate(startDate, 7));
            }}
            onCurrent={() => {
              goToWeek(thisWeek);
            }}
          />
        }
      />

      <div className="flex flex-col gap-4">
        {seesEveryone && bookable.length > 1 && (
          <ProfessionalFilter
            label={t.professionalLabel}
            professionals={bookable}
            selectedId={professionalId}
            onSelect={(id) => {
              setParam({ [PROFESSIONAL_PARAM]: id });
            }}
          />
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            icon={CalendarPlus}
            onClick={() => {
              setDialog({ kind: 'new' });
            }}
          >
            {t.newAppointment}
          </Button>
          {canBlock && (
            <Button
              variant="secondary"
              icon={Lock}
              onClick={() => {
                setDialog({ kind: 'block' });
              }}
            >
              {t.blockTime}
            </Button>
          )}
        </div>

        {week.isPending ? (
          <LoadingState />
        ) : week.isError ? (
          <ErrorState message={errorMessage(week.error)} onRetry={() => void week.refetch()} />
        ) : (
          <WeekGrid
            week={week.data}
            today={today}
            selectedDay={selectedDay}
            onSelectDay={(day) => {
              setParam({ [DAY_PARAM]: day });
            }}
            onOpenAppointment={(appointment) => {
              setDialog({ kind: 'details', appointment });
            }}
            onOpenBlock={
              canBlock
                ? (block) => {
                    setDialog({ kind: 'unblock', block });
                  }
                : null
            }
          />
        )}
      </div>

      <AppointmentDetailsDialog
        appointment={dialog.kind === 'details' ? dialog.appointment : null}
        confirmPending={management.confirm.isPending}
        onClose={close}
        onConfirm={(appointment) => {
          management.confirm.mutate(appointment, { onSuccess: close });
        }}
        onReschedule={(appointment) => {
          setDialog({ kind: 'reschedule', appointment });
        }}
        onCancel={(appointment) => {
          setDialog({ kind: 'cancel', appointment });
        }}
      />
      <RescheduleDialog
        appointment={dialog.kind === 'reschedule' ? dialog.appointment : null}
        today={today}
        professionals={seesEveryone ? bookable : null}
        pending={management.reschedule.isPending}
        onClose={close}
        onConfirm={(values) => {
          if (dialog.kind !== 'reschedule') return;
          management.reschedule.mutate(
            { appointment: dialog.appointment, ...values },
            { onSuccess: close },
          );
        }}
      />
      <CancelDialog
        appointment={dialog.kind === 'cancel' ? dialog.appointment : null}
        now={now}
        pending={management.cancel.isPending}
        onClose={close}
        onConfirm={(reason) => {
          if (dialog.kind !== 'cancel') return;
          management.cancel.mutate(
            { appointment: dialog.appointment, reason },
            { onSuccess: close },
          );
        }}
      />
      <BlockTimeDialog
        open={dialog.kind === 'block'}
        professionalName={professionalName}
        defaultDate={selectedDay}
        today={today}
        pending={management.block.isPending}
        onClose={close}
        onConfirm={(values) => {
          if (!professionalId) return;
          management.block.mutate({ professionalId, ...values }, { onSuccess: close });
        }}
      />
      <ConfirmDialog
        open={dialog.kind === 'unblock'}
        title={t.unblockTitle}
        description={
          dialog.kind === 'unblock'
            ? t.unblockBody(
                `${formatWeekdayShort(isoToLocalDate(dialog.block.start))} ${formatTime(dialog.block.start)}–${formatTime(dialog.block.end)}`,
              )
            : ''
        }
        confirmLabel={t.unblock}
        pending={management.unblock.isPending}
        onClose={close}
        onConfirm={() => {
          if (dialog.kind !== 'unblock') return;
          management.unblock.mutate(dialog.block, { onSuccess: close });
        }}
      />
      {professionalId && (
        <NewAppointmentDialog
          open={dialog.kind === 'new'}
          today={today}
          defaultDate={selectedDay}
          defaultProfessionalId={professionalId}
          professionals={bookable}
          pending={management.schedule.isPending}
          onClose={close}
          onConfirm={(input) => {
            management.schedule.mutate(input, { onSuccess: close });
          }}
        />
      )}
    </>
  );
}

interface WeekGridProps {
  readonly week: WeeklyAgendaDTO;
  readonly today: string;
  readonly selectedDay: string;
  readonly onSelectDay: (day: string) => void;
  readonly onOpenAppointment: (appointment: AppointmentDTO) => void;
  readonly onOpenBlock: ((block: TimeBlockDTO) => void) | null;
}

function WeekGrid({
  week,
  today,
  selectedDay,
  onSelectDay,
  onOpenAppointment,
  onOpenBlock,
}: WeekGridProps) {
  return (
    <>
      {/* Phones: pick one day at a time */}
      <div role="group" aria-label={t.daysLabel} className="flex gap-1 lg:hidden">
        {week.days.map((day) => {
          const selected = day.date === selectedDay;
          const count = day.appointments.filter((a) => a.status !== 'CANCELLED').length;
          return (
            <button
              key={day.date}
              type="button"
              aria-pressed={selected}
              aria-label={`${formatWeekdayShort(day.date)} ${formatShortDate(day.date)}, ${t.countLabel(count)}`}
              onClick={() => {
                onSelectDay(day.date);
              }}
              className={cx(
                'flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center rounded-xl border px-1 font-semibold',
                selected
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-line-strong bg-surface-2',
                day.date === today && !selected && 'border-accent',
              )}
            >
              <span className="text-xs capitalize">{formatWeekdayShort(day.date)}</span>
              <span className="text-lg leading-none">{day.date.slice(8)}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 lg:grid-cols-7">
        {week.days.map((day) => (
          <DayColumn
            key={day.date}
            day={day}
            isToday={day.date === today}
            hiddenOnPhone={day.date !== selectedDay}
            onOpenAppointment={onOpenAppointment}
            onOpenBlock={onOpenBlock}
          />
        ))}
      </div>
    </>
  );
}
