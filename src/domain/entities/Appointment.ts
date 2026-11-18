import {
  CancellationReasonRequiredError,
  InvalidStatusTransitionError,
  LateChangeNotAllowedError,
  NoShowTooEarlyError,
} from '../errors/appointment-errors';
import { InvalidValueError } from '../errors/DomainError';
import { optionalText } from '../shared/guards';
import type { CancellationPolicy } from '../value-objects/CancellationPolicy';
import type { Duration } from '../value-objects/Duration';
import type { Money } from '../value-objects/Money';
import { TimeRange } from '../value-objects/TimeRange';
import {
  ALLOWED_TRANSITIONS,
  isActiveStatus,
  type AppointmentAction,
  type AppointmentStatus,
} from './AppointmentStatus';
import type { AppointmentId, BarbershopId, ClientId, ProfessionalId, ServiceId } from './ids';

export const PAYMENT_METHODS = ['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type ChangeRequestedBy = 'CLIENT' | 'STAFF';

const MAX_REASON_LENGTH = 200;

/** What was actually charged when the service was done ("atendimento"). */
export interface ServiceRecord {
  readonly amountPaid: Money;
  readonly paymentMethod: PaymentMethod;
  readonly completedAt: Date;
}

export interface Cancellation {
  readonly cancelledAt: Date;
  readonly cancelledBy: ChangeRequestedBy;
  readonly reason: string | null;
  /** True when it happened after the policy deadline. */
  readonly late: boolean;
}

export interface AppointmentProps {
  readonly id: AppointmentId;
  readonly barbershopId: BarbershopId;
  readonly professionalId: ProfessionalId;
  readonly clientId: ClientId;
  readonly serviceId: ServiceId;
  readonly range: TimeRange;
  /** Service price at booking time (later price changes don't affect it). */
  readonly price: Money;
  readonly status: AppointmentStatus;
  readonly createdAt: Date;
  readonly cancellation: Cancellation | null;
  readonly serviceRecord: ServiceRecord | null;
}

export interface ScheduleAppointmentInput {
  readonly id: AppointmentId;
  readonly barbershopId: BarbershopId;
  readonly professionalId: ProfessionalId;
  readonly clientId: ClientId;
  readonly serviceId: ServiceId;
  readonly start: Date;
  readonly duration: Duration;
  readonly price: Money;
  readonly createdAt: Date;
}

export interface CancelInput {
  readonly by: ChangeRequestedBy;
  readonly reason: string | null;
  readonly now: Date;
  readonly policy: CancellationPolicy;
}

export interface RescheduleInput {
  readonly start: Date;
  /** Optionally move to another professional. */
  readonly professionalId?: ProfessionalId;
  readonly by: ChangeRequestedBy;
  readonly now: Date;
  readonly policy: CancellationPolicy;
}

export interface CompleteInput {
  readonly amountPaid: Money;
  readonly paymentMethod: PaymentMethod;
  readonly now: Date;
}

/**
 * Immutable: every state change returns a new Appointment.
 * Availability (overlaps, schedule, blocks) is checked by AvailabilityService before booking.
 */
export class Appointment {
  readonly id: AppointmentId;
  readonly barbershopId: BarbershopId;
  readonly professionalId: ProfessionalId;
  readonly clientId: ClientId;
  readonly serviceId: ServiceId;
  readonly range: TimeRange;
  readonly price: Money;
  readonly status: AppointmentStatus;
  readonly createdAt: Date;
  readonly cancellation: Cancellation | null;
  readonly serviceRecord: ServiceRecord | null;

  private constructor(props: AppointmentProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.professionalId = props.professionalId;
    this.clientId = props.clientId;
    this.serviceId = props.serviceId;
    this.range = props.range;
    this.price = props.price;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.cancellation = props.cancellation;
    this.serviceRecord = props.serviceRecord;
  }

  static schedule(input: ScheduleAppointmentInput): Appointment {
    return new Appointment({
      id: input.id,
      barbershopId: input.barbershopId,
      professionalId: input.professionalId,
      clientId: input.clientId,
      serviceId: input.serviceId,
      range: TimeRange.startingAt(input.start, input.duration),
      price: input.price,
      status: 'SCHEDULED',
      createdAt: input.createdAt,
      cancellation: null,
      serviceRecord: null,
    });
  }

  /** Rebuilds a stored appointment, checking that status and records agree. */
  static restore(props: AppointmentProps): Appointment {
    if ((props.status === 'CANCELLED') !== (props.cancellation !== null)) {
      throw new InvalidValueError('appointment', 'cancellation data must match CANCELLED status');
    }
    if ((props.status === 'COMPLETED') !== (props.serviceRecord !== null)) {
      throw new InvalidValueError('appointment', 'service record must match COMPLETED status');
    }
    return new Appointment(props);
  }

  get start(): Date {
    return this.range.start;
  }

  get end(): Date {
    return this.range.end;
  }

  /** Occupies the professional's time. */
  get isActive(): boolean {
    return isActiveStatus(this.status);
  }

  confirm(): Appointment {
    this.ensureCan('confirm');
    return this.with({ status: 'CONFIRMED' });
  }

  /** "Compareceu" — the client is here. */
  markArrived(): Appointment {
    this.ensureCan('markArrived');
    return this.with({ status: 'IN_SERVICE' });
  }

  /** "Cliente faltou" — only after the policy's tolerance has passed. */
  markNoShow(now: Date, policy: CancellationPolicy): Appointment {
    this.ensureCan('markNoShow');
    if (!policy.canMarkNoShow(this.start, now)) {
      throw new NoShowTooEarlyError(policy.noShowAllowedFrom(this.start));
    }
    return this.with({ status: 'NO_SHOW' });
  }

  complete(input: CompleteInput): Appointment {
    this.ensureCan('complete');
    return this.with({
      status: 'COMPLETED',
      serviceRecord: {
        amountPaid: input.amountPaid,
        paymentMethod: input.paymentMethod,
        completedAt: input.now,
      },
    });
  }

  /**
   * Clients must respect the minimum notice. Staff may cancel late, but must give a reason.
   * The freed time is available immediately (CANCELLED is not an active status).
   */
  cancel(input: CancelInput): Appointment {
    this.ensureCan('cancel');
    const reason = optionalText('cancellationReason', input.reason, MAX_REASON_LENGTH);
    const late = input.policy.isLateChange(this.start, input.now);

    if (late && input.by === 'CLIENT') {
      throw new LateChangeNotAllowedError('cancel', input.policy.minNoticeHours);
    }
    if (late && reason === null) {
      throw new CancellationReasonRequiredError();
    }
    return this.with({
      status: 'CANCELLED',
      cancellation: { cancelledAt: input.now, cancelledBy: input.by, reason, late },
    });
  }

  /** Moves to a new start (same duration). Back to SCHEDULED: the client must re-confirm. */
  reschedule(input: RescheduleInput): Appointment {
    this.ensureCan('reschedule');
    if (input.by === 'CLIENT' && input.policy.isLateChange(this.start, input.now)) {
      throw new LateChangeNotAllowedError('reschedule', input.policy.minNoticeHours);
    }
    const duration = this.range.end.getTime() - this.range.start.getTime();
    return this.with({
      status: 'SCHEDULED',
      professionalId: input.professionalId ?? this.professionalId,
      range: TimeRange.create(input.start, new Date(input.start.getTime() + duration)),
    });
  }

  private ensureCan(action: AppointmentAction): void {
    if (!ALLOWED_TRANSITIONS[action].includes(this.status)) {
      throw new InvalidStatusTransitionError(this.status, action);
    }
  }

  private with(changes: Partial<AppointmentProps>): Appointment {
    return new Appointment({ ...this.toProps(), ...changes });
  }

  toProps(): AppointmentProps {
    return {
      id: this.id,
      barbershopId: this.barbershopId,
      professionalId: this.professionalId,
      clientId: this.clientId,
      serviceId: this.serviceId,
      range: this.range,
      price: this.price,
      status: this.status,
      createdAt: this.createdAt,
      cancellation: this.cancellation,
      serviceRecord: this.serviceRecord,
    };
  }
}
