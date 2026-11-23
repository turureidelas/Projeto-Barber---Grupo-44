import type { AppointmentDTO } from '@application/dto/agenda';
import { formatTime } from '@shared/format';
import { useId } from 'react';
import { AppointmentActionButtons } from '../../components/agenda/AppointmentActionButtons';
import { StatusBadge } from '../../components/agenda/StatusBadge';
import type { AppointmentActions } from '../../hooks/useAgenda';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.today;

interface SpotlightProps {
  readonly appointment: AppointmentDTO;
  readonly title: string;
  readonly showProfessional: boolean;
  readonly actions: AppointmentActions;
  readonly onComplete: (appointment: AppointmentDTO) => void;
  readonly now: Date;
}

/**
 * Highlighted card readable at a glance (big time and name) with big buttons:
 * what Ricardo needs between two clients, with wet hands.
 */
export function SpotlightCard({
  appointment,
  title,
  showProfessional,
  actions,
  onComplete,
  now,
}: SpotlightProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-card border-2 border-accent bg-accent/5 p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-sm font-bold tracking-wide text-accent uppercase">
          {title}
        </h2>
        <StatusBadge status={appointment.status} />
      </div>
      <div className="mb-4 flex items-baseline gap-4">
        <p className="text-4xl font-extrabold tabular-nums sm:text-5xl">
          {formatTime(appointment.start)}
        </p>
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold">{appointment.clientName}</p>
          <p className="text-fg-muted">
            {appointment.serviceName}
            {showProfessional && ` · ${t.withProfessional(appointment.professionalName)}`}
          </p>
          <p className="text-sm text-fg-muted">{appointment.clientPhoneMasked}</p>
        </div>
      </div>
      <AppointmentActionButtons
        appointment={appointment}
        actions={actions}
        onComplete={onComplete}
        now={now}
        size="lg"
        explainNoShow
      />
    </section>
  );
}
