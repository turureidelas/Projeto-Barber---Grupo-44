import type { AppointmentDTO, TimeBlockDTO } from '@application/dto/agenda';
import { formatMoney, formatTime } from '@shared/format';
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { ptBR } from '../../i18n/pt-BR';
import { cx } from '../ui/cx';
import { StatusBadge } from './StatusBadge';

const t = ptBR.today;

interface AppointmentItemProps {
  readonly appointment: AppointmentDTO;
  /** Show who attends (when listing several professionals). */
  readonly showProfessional: boolean;
  readonly actions?: ReactNode;
}

/** One row of the day: time, client, service, status and the possible actions. */
export function AppointmentItem({ appointment, showProfessional, actions }: AppointmentItemProps) {
  const finished = appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW';
  return (
    <article
      aria-label={`${formatTime(appointment.start)} · ${appointment.clientName}`}
      className={cx(
        'flex gap-3 rounded-card border border-line bg-surface p-3 sm:gap-4 sm:p-4',
        appointment.status === 'IN_SERVICE' && 'border-accent/60',
        finished && 'opacity-70',
      )}
    >
      <div className="w-14 shrink-0 text-center">
        <p className="text-lg font-bold tabular-nums">{formatTime(appointment.start)}</p>
        <p className="text-sm text-fg-muted tabular-nums">{formatTime(appointment.end)}</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              className={cx(
                'truncate text-lg font-semibold',
                appointment.status === 'CANCELLED' && 'line-through',
              )}
            >
              {appointment.clientName}
            </h3>
            <p className="text-fg-muted">
              {appointment.serviceName}
              {showProfessional && ` · ${t.withProfessional(appointment.professionalName)}`}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
        <Details appointment={appointment} />
        {actions}
      </div>
    </article>
  );
}

function Details({ appointment }: { readonly appointment: AppointmentDTO }) {
  if (appointment.payment) {
    return (
      <p className="font-medium text-success">
        {t.paid(
          formatMoney(appointment.payment.amountPaidCents),
          ptBR.paymentMethods[appointment.payment.method],
        )}
      </p>
    );
  }
  if (appointment.cancellation) {
    const { reason, late } = appointment.cancellation;
    const details = [reason, late ? t.lateCancellation : null].filter(Boolean).join(' · ');
    return details ? <p className="text-sm text-fg-muted">{details}</p> : null;
  }
  return null;
}

interface TimeBlockItemProps {
  readonly block: TimeBlockDTO;
  /** Shown when listing several professionals. */
  readonly professionalName?: string | undefined;
}

export function TimeBlockItem({ block, professionalName }: TimeBlockItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-dashed border-line-strong px-3 py-3 text-fg-muted sm:px-4">
      <div className="w-14 shrink-0 text-center text-sm tabular-nums">
        {formatTime(block.start)}
        <br />
        {formatTime(block.end)}
      </div>
      <Lock aria-hidden="true" className="size-5 shrink-0" />
      <p>
        <span className="font-semibold text-fg">{t.blocked}</span>
        {block.reason && ` · ${block.reason}`}
        {professionalName && ` · ${t.withProfessional(professionalName)}`}
      </p>
    </div>
  );
}
