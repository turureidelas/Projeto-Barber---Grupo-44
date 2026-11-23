import type { AppointmentDTO } from '@application/dto/agenda';
import { formatTime } from '@shared/format';
import { CircleCheckBig, Undo2, UserCheck, UserX, type LucideIcon } from 'lucide-react';
import type { AppointmentActions } from '../../hooks/useAgenda';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from '../ui/Button';
import type { ButtonSize, ButtonVariant } from '../ui/button-styles';

const t = ptBR.today;

interface AppointmentActionButtonsProps {
  readonly appointment: AppointmentDTO;
  readonly actions: AppointmentActions;
  readonly onComplete: (appointment: AppointmentDTO) => void;
  readonly now: Date;
  readonly size?: ButtonSize;
  /**
   * Highlighted card: always show "Faltou" (disabled until the tolerance passes, with a hint).
   * List rows: only show it once it can be used, to keep rows short.
   */
  readonly explainNoShow?: boolean;
}

/** The actions that make sense for the appointment's current status — each one is one tap. */
export function AppointmentActionButtons({
  appointment,
  actions,
  onComplete,
  now,
  size = 'md',
  explainNoShow = false,
}: AppointmentActionButtonsProps) {
  const busy = actions.pendingId === appointment.id;
  const noShowAllowed = now.getTime() >= Date.parse(appointment.noShowAllowedFrom);

  const button = (
    label: string,
    icon: LucideIcon,
    variant: ButtonVariant,
    onClick: () => void,
    disabled = false,
  ) => (
    <Button
      key={label}
      size={size}
      variant={variant}
      icon={icon}
      disabled={busy || disabled}
      aria-label={t.actions.forClient(label, appointment.clientName)}
      onClick={onClick}
      className="flex-1 sm:flex-none"
    >
      {label}
    </Button>
  );

  const complete = (variant: ButtonVariant) =>
    button(t.actions.complete, CircleCheckBig, variant, () => {
      onComplete(appointment);
    });

  switch (appointment.status) {
    case 'SCHEDULED':
    case 'CONFIRMED': {
      const showNoShow = explainNoShow || noShowAllowed;
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {button(t.actions.arrived, UserCheck, 'primary', () => {
              actions.markArrived.mutate(appointment);
            })}
            {complete('secondary')}
            {showNoShow &&
              button(
                t.actions.noShow,
                UserX,
                'secondary',
                () => {
                  actions.markNoShow.mutate(appointment);
                },
                !noShowAllowed,
              )}
          </div>
          {explainNoShow && !noShowAllowed && (
            <p className="text-sm text-fg-muted">
              {t.noShowFrom(formatTime(appointment.noShowAllowedFrom))}
            </p>
          )}
        </div>
      );
    }
    case 'IN_SERVICE':
      return <div className="flex flex-wrap gap-2">{complete('primary')}</div>;
    case 'NO_SHOW':
      return (
        <div className="flex flex-wrap gap-2">
          {button(t.actions.undoNoShow, Undo2, 'ghost', () => {
            actions.undoNoShow.mutate(appointment);
          })}
        </div>
      );
    case 'COMPLETED':
    case 'CANCELLED':
      return null;
  }
}
