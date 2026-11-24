import type { AppointmentDTO } from '@application/dto/agenda';
import {
  formatDateTime,
  formatLongDate,
  formatMoney,
  formatTime,
  isoToLocalDate,
} from '@shared/format';
import { CalendarClock, CalendarX, Phone } from 'lucide-react';
import { ptBR } from '../../i18n/pt-BR';
import { StatusBadge } from '../agenda/StatusBadge';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';

const t = ptBR.clientArea.home;
const CHANGEABLE: readonly AppointmentDTO['status'][] = ['SCHEDULED', 'CONFIRMED'];

interface MyAppointmentCardProps {
  readonly appointment: AppointmentDTO;
  readonly now: Date;
  /** The next one: bigger, highlighted. */
  readonly highlight?: boolean;
  /** Barbershop phone, offered when it is too late to change through the app. */
  readonly shopPhone: string | null;
  readonly cancelling: boolean;
  readonly onCancel: (appointment: AppointmentDTO) => void;
  readonly onReschedule: (appointment: AppointmentDTO) => void;
}

/** An upcoming appointment of the client, with "Remarcar" / "Cancelar" while still allowed. */
export function MyAppointmentCard({
  appointment,
  now,
  highlight = false,
  shopPhone,
  cancelling,
  onCancel,
  onReschedule,
}: MyAppointmentCardProps) {
  const when = formatDateTime(appointment.start);
  const changeable = CHANGEABLE.includes(appointment.status);
  // The deadline comes from the server (policy); the UI only compares it with the clock.
  const inTime = now.getTime() <= Date.parse(appointment.changeDeadline);

  return (
    <article
      className={cx(
        'flex flex-col gap-3 rounded-card border p-4',
        highlight ? 'border-accent/60 bg-accent/5 sm:p-5' : 'border-line bg-surface',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-fg-muted first-letter:uppercase">
            {formatLongDate(isoToLocalDate(appointment.start))}
          </p>
          <p
            className={cx(
              'font-extrabold tabular-nums',
              highlight ? 'text-4xl sm:text-5xl' : 'text-2xl',
            )}
          >
            {formatTime(appointment.start)}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>
      <div>
        <p className="text-lg font-semibold">{appointment.serviceName}</p>
        <p className="text-fg-muted">
          {t.withProfessional(appointment.professionalName)} · {formatMoney(appointment.priceCents)}
        </p>
      </div>

      {changeable && inTime && (
        <>
          <p className="text-sm text-fg-muted">
            {t.changeUntil(formatDateTime(appointment.changeDeadline))}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              icon={CalendarClock}
              aria-label={t.actionFor(t.reschedule, appointment.serviceName, when)}
              onClick={() => {
                onReschedule(appointment);
              }}
            >
              {t.reschedule}
            </Button>
            <Button
              variant="ghost"
              icon={CalendarX}
              className="text-danger"
              loading={cancelling}
              aria-label={t.actionFor(t.cancel, appointment.serviceName, when)}
              onClick={() => {
                onCancel(appointment);
              }}
            >
              {t.cancel}
            </Button>
          </div>
        </>
      )}
      {changeable && !inTime && shopPhone && (
        <p className="flex gap-2 text-sm text-fg-muted">
          <Phone aria-hidden="true" className="size-4 shrink-0 translate-y-0.5" />
          <span>
            {t.tooLate(shopPhone)}{' '}
            <a
              href={`tel:${shopPhone.replace(/\D/g, '')}`}
              className="font-semibold text-accent underline underline-offset-4"
            >
              {ptBR.clientArea.account.call}
            </a>
          </span>
        </p>
      )}
    </article>
  );
}

/** A past appointment: when, what, with whom and how it ended. */
export function PastAppointmentItem({ appointment }: { readonly appointment: AppointmentDTO }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{appointment.serviceName}</p>
        <p className="text-sm text-fg-muted">
          {formatDateTime(appointment.start)} · {t.withProfessional(appointment.professionalName)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusBadge status={appointment.status} />
        {appointment.payment && (
          <span className="text-sm text-fg-muted tabular-nums">
            {formatMoney(appointment.payment.amountPaidCents)}
          </span>
        )}
      </div>
    </div>
  );
}
