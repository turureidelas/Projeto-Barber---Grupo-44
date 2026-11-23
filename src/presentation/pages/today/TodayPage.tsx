import type { AppointmentDTO, DailyAgendaDTO, TimeBlockDTO } from '@application/dto/agenda';
import { addDaysToLocalDate, formatLongDate, isLocalDateString } from '@shared/format';
import { CalendarX2, Coffee } from 'lucide-react';
import { useId, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AppointmentActionButtons } from '../../components/agenda/AppointmentActionButtons';
import { AppointmentItem, TimeBlockItem } from '../../components/agenda/AppointmentItem';
import { CompleteDialog } from '../../components/agenda/CompleteDialog';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/states';
import {
  useAppointmentActions,
  useDailyAgenda,
  type AppointmentActions,
} from '../../hooks/useAgenda';
import { useProfessionals } from '../../hooks/useCatalog';
import { useNow, useToday } from '../../hooks/useNow';
import { useCurrentUser } from '../../hooks/useSession';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';
import { DaySummary } from './DaySummary';
import { DateNavigator, ProfessionalFilter } from './filters';
import { InServiceList } from './InServiceList';
import { SpotlightCard } from './SpotlightCard';

const t = ptBR.today;
const DAY_PARAM = 'dia';
const PROFESSIONAL_PARAM = 'profissional';

/**
 * Home screen — "Agenda de hoje". Shows in seconds: who is next, who is being attended,
 * how the day is going, and every time slot with one-tap actions.
 */
export function TodayPage() {
  const user = useCurrentUser();
  const today = useToday();
  const now = useNow();
  const [params, setParams] = useSearchParams();

  const dayParam = params.get(DAY_PARAM);
  const date = dayParam && isLocalDateString(dayParam) ? dayParam : today;
  const isToday = date === today;
  const seesEveryone = user.permissions.includes('agenda:manage-all');
  const professionalId = seesEveryone ? params.get(PROFESSIONAL_PARAM) : null;

  const agenda = useDailyAgenda(date, professionalId);
  const professionals = useProfessionals({ enabled: seesEveryone });
  const actions = useAppointmentActions();
  const [completing, setCompleting] = useState<AppointmentDTO | null>(null);

  const setParam = (key: string, value: string | null) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };
  const goToDay = (day: string) => {
    setParam(DAY_PARAM, day === today ? null : day);
  };

  return (
    <>
      <PageHeader
        title={isToday ? t.title : t.otherDayTitle}
        subtitle={formatLongDate(date)}
        actions={
          <DateNavigator
            isToday={isToday}
            onPrevious={() => {
              goToDay(addDaysToLocalDate(date, -1));
            }}
            onNext={() => {
              goToDay(addDaysToLocalDate(date, 1));
            }}
            onToday={() => {
              goToDay(today);
            }}
          />
        }
      />

      <div className="flex flex-col gap-5">
        {seesEveryone && (professionals.data?.length ?? 0) > 1 && (
          <ProfessionalFilter
            professionals={professionals.data ?? []}
            selectedId={professionalId}
            onSelect={(id) => {
              setParam(PROFESSIONAL_PARAM, id);
            }}
          />
        )}

        {agenda.isPending ? (
          <LoadingState />
        ) : agenda.isError ? (
          <ErrorState message={errorMessage(agenda.error)} onRetry={() => void agenda.refetch()} />
        ) : (
          <DayContent
            agenda={agenda.data}
            isToday={isToday}
            showProfessional={seesEveryone && professionalId === null}
            actions={actions}
            onComplete={setCompleting}
            now={now}
          />
        )}
      </div>

      <CompleteDialog
        appointment={completing}
        pending={actions.complete.isPending}
        onClose={() => {
          setCompleting(null);
        }}
        onConfirm={(values) => {
          if (!completing) return;
          actions.complete.mutate(
            { appointmentId: completing.id, ...values },
            {
              onSuccess: () => {
                setCompleting(null);
              },
            },
          );
        }}
      />
    </>
  );
}

interface DayContentProps {
  readonly agenda: DailyAgendaDTO;
  readonly isToday: boolean;
  readonly showProfessional: boolean;
  readonly actions: AppointmentActions;
  readonly onComplete: (appointment: AppointmentDTO) => void;
  readonly now: Date;
}

function DayContent({
  agenda,
  isToday,
  showProfessional,
  actions,
  onComplete,
  now,
}: DayContentProps) {
  const scheduleHeadingId = useId();
  const [showCancelled, setShowCancelled] = useState(false);

  const cancelledCount = agenda.summary.cancelled;
  const visible = agenda.appointments.filter(
    (appointment) => showCancelled || appointment.status !== 'CANCELLED',
  );
  const timeline = mergeTimeline(visible, agenda.timeBlocks);
  const professionalName = (id: string) =>
    agenda.professionals.find((professional) => professional.id === id)?.name;
  const spotlight = { showProfessional, actions, onComplete, now };

  if (agenda.appointments.length === 0 && agenda.timeBlocks.length === 0) {
    return <EmptyState icon={CalendarX2} title={t.emptyTitle} description={t.emptyBody} />;
  }

  return (
    <>
      {isToday && (
        <div className="flex flex-col gap-3">
          {agenda.next ? (
            <SpotlightCard appointment={agenda.next} title={t.nextClient} {...spotlight} />
          ) : (
            agenda.inService.length === 0 && (
              <p className="flex items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 text-fg-muted">
                <Coffee aria-hidden="true" className="size-5" />
                {t.noMoreClients}
              </p>
            )
          )}
          <InServiceList
            appointments={agenda.inService}
            showProfessional={showProfessional}
            actions={actions}
            onComplete={onComplete}
          />
        </div>
      )}

      <DaySummary summary={agenda.summary} />

      <section aria-labelledby={scheduleHeadingId} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={scheduleHeadingId} className="text-xl font-bold">
            {t.schedule}
          </h2>
          {cancelledCount > 0 && (
            <Button
              variant="ghost"
              aria-pressed={showCancelled}
              onClick={() => {
                setShowCancelled((current) => !current);
              }}
            >
              {showCancelled ? t.hideCancelled : t.showCancelled(cancelledCount)}
            </Button>
          )}
        </div>
        <ol className="flex flex-col gap-2">
          {timeline.map((entry) => (
            <li key={entry.item.id}>
              {entry.kind === 'block' ? (
                <TimeBlockItem
                  block={entry.item}
                  professionalName={
                    showProfessional ? professionalName(entry.item.professionalId) : undefined
                  }
                />
              ) : (
                <AppointmentItem
                  appointment={entry.item}
                  showProfessional={showProfessional}
                  actions={
                    <AppointmentActionButtons
                      appointment={entry.item}
                      actions={actions}
                      onComplete={onComplete}
                      now={now}
                    />
                  }
                />
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

type TimelineEntry =
  | { readonly kind: 'appointment'; readonly item: AppointmentDTO }
  | { readonly kind: 'block'; readonly item: TimeBlockDTO };

/** Appointments and blocked times in a single chronological list. */
function mergeTimeline(
  appointments: readonly AppointmentDTO[],
  blocks: readonly TimeBlockDTO[],
): TimelineEntry[] {
  return [
    ...appointments.map((item) => ({ kind: 'appointment' as const, item })),
    ...blocks.map((item) => ({ kind: 'block' as const, item })),
  ].sort((a, b) => Date.parse(a.item.start) - Date.parse(b.item.start));
}
