import type { AppointmentDTO } from '@application/dto/agenda';
import { formatDateTime, formatMoney, formatTime, isoToLocalDate } from '@shared/format';
import { CalendarClock, CalendarX2, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '../../app/routes';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from '../ui/Button';
import { buttonClasses } from '../ui/button-styles';
import { Modal } from '../ui/Modal';
import { StatusBadge } from './StatusBadge';

const t = ptBR.details;

interface AppointmentDetailsDialogProps {
  readonly appointment: AppointmentDTO | null;
  readonly confirmPending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (appointment: AppointmentDTO) => void;
  readonly onReschedule: (appointment: AppointmentDTO) => void;
  readonly onCancel: (appointment: AppointmentDTO) => void;
}

/** Everything about one appointment, plus what can be done with it now. */
export function AppointmentDetailsDialog({
  appointment,
  confirmPending,
  onClose,
  onConfirm,
  onReschedule,
  onCancel,
}: AppointmentDetailsDialogProps) {
  const changeable = appointment?.status === 'SCHEDULED' || appointment?.status === 'CONFIRMED';

  return (
    <Modal
      open={appointment !== null}
      onClose={onClose}
      title={appointment?.clientName ?? t.title}
      footer={
        appointment && (
          <>
            <Link
              to={`${paths.today}?dia=${isoToLocalDate(appointment.start)}`}
              className={buttonClasses({ variant: 'ghost' })}
            >
              {t.openDay}
            </Link>
            {changeable && (
              <>
                <Button
                  variant="secondary"
                  icon={CalendarX2}
                  onClick={() => {
                    onCancel(appointment);
                  }}
                >
                  {t.cancel}
                </Button>
                <Button
                  variant="secondary"
                  icon={CalendarClock}
                  onClick={() => {
                    onReschedule(appointment);
                  }}
                >
                  {t.reschedule}
                </Button>
              </>
            )}
            {appointment.status === 'SCHEDULED' && (
              <Button
                icon={ThumbsUp}
                loading={confirmPending}
                onClick={() => {
                  onConfirm(appointment);
                }}
              >
                {t.confirm}
              </Button>
            )}
          </>
        )
      }
    >
      {appointment && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
          <dt className="text-fg-muted">{t.status}</dt>
          <dd>
            <StatusBadge status={appointment.status} />
          </dd>
          <dt className="text-fg-muted">{t.when}</dt>
          <dd className="font-semibold">
            {formatDateTime(appointment.start)}–{formatTime(appointment.end)}
          </dd>
          <dt className="text-fg-muted">{t.service}</dt>
          <dd>{appointment.serviceName}</dd>
          <dt className="text-fg-muted">{t.professional}</dt>
          <dd>{appointment.professionalName}</dd>
          <dt className="text-fg-muted">{t.phone}</dt>
          <dd>{appointment.clientPhoneMasked}</dd>
          <dt className="text-fg-muted">{t.price}</dt>
          <dd>{formatMoney(appointment.priceCents)}</dd>
        </dl>
      )}
    </Modal>
  );
}
