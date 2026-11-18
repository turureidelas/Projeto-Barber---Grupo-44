import type { Appointment, PaymentMethod } from '@domain/entities/Appointment';
import { assertCanManageAgendaOf } from '@domain/services/access-control';
import type { CancellationPolicy } from '@domain/value-objects/CancellationPolicy';
import { Money } from '@domain/value-objects/Money';
import type { ApplicationDependencies } from '../../dependencies';
import type { AppointmentDTO } from '../../dto/agenda';
import { requireActor } from '../../services/actor';
import { assembleAppointment } from '../../services/assemblers';
import { requireAppointment, requireBarbershop } from '../../services/lookups';
import type { UseCase } from '../UseCase';

/**
 * One-tap actions on an existing appointment (confirm, arrived, no-show, complete, cancel).
 * They share the same flow: load → check permission → apply the domain transition → save.
 */

export interface AppointmentCommandInput {
  readonly appointmentId: string;
}

export interface CommandContext {
  readonly now: Date;
  readonly policy: CancellationPolicy;
}

type Deps = Pick<
  ApplicationDependencies,
  | 'auth'
  | 'users'
  | 'clock'
  | 'barbershops'
  | 'professionals'
  | 'services'
  | 'clients'
  | 'appointments'
>;

abstract class AppointmentCommand<Input extends AppointmentCommandInput> implements UseCase<
  Input,
  AppointmentDTO
> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: Input): Promise<AppointmentDTO> {
    const actor = await requireActor(this.deps);
    const appointment = await requireAppointment(this.deps, actor, input.appointmentId);
    assertCanManageAgendaOf(actor, appointment.professionalId);
    const barbershop = await requireBarbershop(this.deps, actor);

    const updated = this.apply(appointment, input, {
      now: this.deps.clock.now(),
      policy: barbershop.cancellationPolicy,
    });
    await this.deps.appointments.save(updated);
    return assembleAppointment(this.deps, barbershop, updated);
  }

  protected abstract apply(
    appointment: Appointment,
    input: Input,
    context: CommandContext,
  ): Appointment;
}

export class ConfirmAppointment extends AppointmentCommand<AppointmentCommandInput> {
  protected apply(appointment: Appointment): Appointment {
    return appointment.confirm();
  }
}

/** "Compareceu" */
export class MarkArrived extends AppointmentCommand<AppointmentCommandInput> {
  protected apply(appointment: Appointment): Appointment {
    return appointment.markArrived();
  }
}

/** "Cliente faltou" */
export class MarkNoShow extends AppointmentCommand<AppointmentCommandInput> {
  protected apply(
    appointment: Appointment,
    _input: AppointmentCommandInput,
    { now, policy }: CommandContext,
  ): Appointment {
    return appointment.markNoShow(now, policy);
  }
}

export interface CompleteAppointmentInput extends AppointmentCommandInput {
  readonly amountPaidCents: number;
  readonly paymentMethod: PaymentMethod;
}

/** "Concluir atendimento" with the amount paid and payment method. */
export class CompleteAppointment extends AppointmentCommand<CompleteAppointmentInput> {
  protected apply(
    appointment: Appointment,
    input: CompleteAppointmentInput,
    { now }: CommandContext,
  ): Appointment {
    return appointment.complete({
      amountPaid: Money.fromCents(input.amountPaidCents),
      paymentMethod: input.paymentMethod,
      now,
    });
  }
}

export interface CancelAppointmentInput extends AppointmentCommandInput {
  /** Required when cancelling after the policy deadline. */
  readonly reason: string | null;
}

/** Cancelled from the panel (by staff). The slot is freed immediately. */
export class CancelAppointment extends AppointmentCommand<CancelAppointmentInput> {
  protected apply(
    appointment: Appointment,
    input: CancelAppointmentInput,
    { now, policy }: CommandContext,
  ): Appointment {
    return appointment.cancel({ by: 'STAFF', reason: input.reason, now, policy });
  }
}
