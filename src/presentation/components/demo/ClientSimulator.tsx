import type { AppointmentDTO } from '@application/dto/agenda';
import { formatDateTime, formatTime } from '@shared/format';
import { useState } from 'react';
import { useDailyAgenda } from '../../hooks/useAgenda';
import { useClientSimulator } from '../../hooks/useDemo';
import { useNow, useToday } from '../../hooks/useNow';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';
import { RescheduleDialog } from '../agenda/RescheduleDialog';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { TextField } from '../ui/fields';
import { ErrorState, LoadingState } from '../ui/states';

const t = ptBR.simulator;
const CHANGEABLE: readonly AppointmentDTO['status'][] = ['SCHEDULED', 'CONFIRMED'];

/**
 * Demo only. Plays the client app: pick an upcoming booking and cancel or reschedule it
 * the way the client would (the use case applies the notice period and leaves a notice).
 */
export function ClientSimulator({ minNoticeHours }: { readonly minNoticeHours: number }) {
  const today = useToday();
  const now = useNow();
  const [date, setDate] = useState(today);
  const [moving, setMoving] = useState<AppointmentDTO | null>(null);
  const agenda = useDailyAgenda(date, null);
  const simulator = useClientSimulator();

  const upcoming = (agenda.data?.appointments ?? []).filter(
    (appointment) =>
      CHANGEABLE.includes(appointment.status) && Date.parse(appointment.start) > now.getTime(),
  );
  const pendingId = simulator.cancel.isPending ? simulator.cancel.variables.id : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-bold">{t.title}</h3>
        <p className="mt-1 text-fg-muted">{t.body}</p>
        <p className="mt-1 text-sm text-fg-muted">{t.policy(minNoticeHours)}</p>
      </div>
      <div className="sm:max-w-xs">
        <TextField
          type="date"
          label={t.date}
          min={today}
          value={date}
          onChange={(event) => {
            if (event.target.value) setDate(event.target.value);
          }}
        />
      </div>

      {agenda.isPending ? (
        <LoadingState />
      ) : agenda.isError ? (
        <ErrorState message={errorMessage(agenda.error)} onRetry={() => void agenda.refetch()} />
      ) : upcoming.length === 0 ? (
        <p className="text-fg-muted">{t.empty}</p>
      ) : (
        <ul aria-label={t.listLabel} className="flex flex-col gap-2">
          {upcoming.map((appointment) => {
            const when = formatDateTime(appointment.start);
            const late = Date.parse(appointment.changeDeadline) < now.getTime();
            return (
              <li
                key={appointment.id}
                className="flex flex-col gap-2 rounded-card border border-line bg-surface-2 p-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="font-semibold">
                    <span className="tabular-nums">{formatTime(appointment.start)}</span> ·{' '}
                    {appointment.clientName}
                    {late && (
                      <Badge tone="warning" className="ml-2">
                        {t.late}
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-fg-muted">
                    {appointment.serviceName} ·{' '}
                    {ptBR.today.withProfessional(appointment.professionalName)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    aria-label={t.rescheduleLabel(appointment.clientName, when)}
                    onClick={() => {
                      setMoving(appointment);
                    }}
                  >
                    {t.reschedule}
                  </Button>
                  <Button
                    variant="danger"
                    aria-label={t.cancelLabel(appointment.clientName, when)}
                    loading={pendingId === appointment.id}
                    onClick={() => {
                      simulator.cancel.mutate(appointment);
                    }}
                  >
                    {t.cancel}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <RescheduleDialog
        appointment={moving}
        today={today}
        professionals={null}
        pending={simulator.reschedule.isPending}
        onClose={() => {
          setMoving(null);
        }}
        onConfirm={({ start }) => {
          if (!moving) return;
          simulator.reschedule.mutate(
            { appointment: moving, start },
            {
              onSuccess: () => {
                setMoving(null);
              },
            },
          );
        }}
      />
    </div>
  );
}
