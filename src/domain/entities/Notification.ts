import { InvalidValueError } from '../errors/DomainError';
import type { Appointment } from './Appointment';
import type {
  AppointmentId,
  BarbershopId,
  ClientId,
  NotificationId,
  ProfessionalId,
  ServiceId,
  UserId,
} from './ids';

export const NOTIFICATION_KINDS = ['APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface NotificationProps {
  readonly id: NotificationId;
  readonly barbershopId: BarbershopId;
  readonly kind: NotificationKind;
  readonly appointmentId: AppointmentId;
  /** Whose agenda changed (after the change, when rescheduled). */
  readonly professionalId: ProfessionalId;
  readonly clientId: ClientId;
  readonly serviceId: ServiceId;
  /** Start before the change — that time is free again. */
  readonly previousStart: Date;
  /** New start when rescheduled; null when cancelled. */
  readonly newStart: Date | null;
  readonly createdAt: Date;
  /** Each staff member marks it as read for themselves. */
  readonly readBy: readonly UserId[];
}

interface ChangeInput {
  readonly id: NotificationId;
  readonly now: Date;
}

/**
 * A notice in the panel ("aviso"): the client cancelled or rescheduled through the app.
 * Immutable, like every entity.
 */
export class Notification {
  readonly id: NotificationId;
  readonly barbershopId: BarbershopId;
  readonly kind: NotificationKind;
  readonly appointmentId: AppointmentId;
  readonly professionalId: ProfessionalId;
  readonly clientId: ClientId;
  readonly serviceId: ServiceId;
  readonly previousStart: Date;
  readonly newStart: Date | null;
  readonly createdAt: Date;
  readonly readBy: readonly UserId[];

  private constructor(props: NotificationProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.kind = props.kind;
    this.appointmentId = props.appointmentId;
    this.professionalId = props.professionalId;
    this.clientId = props.clientId;
    this.serviceId = props.serviceId;
    this.previousStart = props.previousStart;
    this.newStart = props.newStart;
    this.createdAt = props.createdAt;
    this.readBy = props.readBy;
  }

  /** The client cancelled `appointment` (already cancelled). */
  static clientCancelled(appointment: Appointment, input: ChangeInput): Notification {
    return Notification.restore({
      ...fromAppointment(appointment, input),
      kind: 'APPOINTMENT_CANCELLED',
      previousStart: appointment.start,
      newStart: null,
    });
  }

  /** The client moved `before` to `after`. */
  static clientRescheduled(
    before: Appointment,
    after: Appointment,
    input: ChangeInput,
  ): Notification {
    return Notification.restore({
      ...fromAppointment(after, input),
      kind: 'APPOINTMENT_RESCHEDULED',
      previousStart: before.start,
      newStart: after.start,
    });
  }

  static restore(props: NotificationProps): Notification {
    if ((props.kind === 'APPOINTMENT_RESCHEDULED') !== (props.newStart !== null)) {
      throw new InvalidValueError('notification', 'only a reschedule has a new start');
    }
    return new Notification({ ...props, readBy: [...new Set(props.readBy)] });
  }

  isReadBy(userId: UserId): boolean {
    return this.readBy.includes(userId);
  }

  markReadBy(userId: UserId): Notification {
    if (this.isReadBy(userId)) return this;
    return Notification.restore({ ...this.toProps(), readBy: [...this.readBy, userId] });
  }

  toProps(): NotificationProps {
    return {
      id: this.id,
      barbershopId: this.barbershopId,
      kind: this.kind,
      appointmentId: this.appointmentId,
      professionalId: this.professionalId,
      clientId: this.clientId,
      serviceId: this.serviceId,
      previousStart: this.previousStart,
      newStart: this.newStart,
      createdAt: this.createdAt,
      readBy: this.readBy,
    };
  }
}

function fromAppointment(appointment: Appointment, { id, now }: ChangeInput) {
  return {
    id,
    barbershopId: appointment.barbershopId,
    appointmentId: appointment.id,
    professionalId: appointment.professionalId,
    clientId: appointment.clientId,
    serviceId: appointment.serviceId,
    createdAt: now,
    readBy: [],
  };
}
