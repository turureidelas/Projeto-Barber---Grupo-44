import type { AppointmentDTO } from '@application/dto/agenda';
import { formatTime } from '@shared/format';
import { CircleCheckBig } from 'lucide-react';
import { useId } from 'react';
import { Button } from '../../components/ui/Button';
import type { AppointmentActions } from '../../hooks/useAgenda';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.today;

interface InServiceListProps {
  readonly appointments: readonly AppointmentDTO[];
  readonly showProfessional: boolean;
  readonly actions: AppointmentActions;
  readonly onComplete: (appointment: AppointmentDTO) => void;
}

/**
 * Clients in the chair right now — compact (one per chair) so the next client stays visible,
 * each with its "Concluir" button.
 */
export function InServiceList({
  appointments,
  showProfessional,
  actions,
  onComplete,
}: InServiceListProps) {
  const headingId = useId();
  if (appointments.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-sm font-bold tracking-wide text-fg-muted uppercase">
        {t.inService}
      </h2>
      <ul className="flex flex-col gap-2">
        {appointments.map((appointment) => (
          <li
            key={appointment.id}
            className="flex items-center gap-3 rounded-card border border-accent/40 bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{appointment.clientName}</p>
              <p className="text-sm text-fg-muted">
                {formatTime(appointment.start)}–{formatTime(appointment.end)} ·{' '}
                {appointment.serviceName}
                {showProfessional && ` · ${t.withProfessional(appointment.professionalName)}`}
              </p>
            </div>
            <Button
              icon={CircleCheckBig}
              disabled={actions.pendingId === appointment.id}
              aria-label={t.actions.forClient(t.actions.complete, appointment.clientName)}
              onClick={() => {
                onComplete(appointment);
              }}
            >
              {t.actions.complete}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
