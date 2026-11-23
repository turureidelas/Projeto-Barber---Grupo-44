import { toId, type NotificationId } from '@domain/entities/ids';
import type { Notification } from '@domain/entities/Notification';
import type { User } from '@domain/entities/User';
import { canManageAgendaOf } from '@domain/services/access-control';
import type { ApplicationDependencies } from '../../dependencies';
import type { NotificationDTO, NotificationListDTO } from '../../dto/notifications';
import { NotFoundError } from '../../errors';
import { requireActor } from '../../services/actor';
import type { UseCase } from '../UseCase';

type Deps = Pick<
  ApplicationDependencies,
  'auth' | 'users' | 'clock' | 'notifications' | 'professionals' | 'services' | 'clients'
>;

/** How many recent notices the panel keeps showing. */
export const NOTIFICATION_LIMIT = 30;

/** Each person sees the notices about the agendas they take care of. */
async function visibleNotifications(deps: Deps, actor: User): Promise<Notification[]> {
  const recent = await deps.notifications.listRecent(actor.barbershopId, NOTIFICATION_LIMIT * 3);
  return recent
    .filter((notification) => canManageAgendaOf(actor, notification.professionalId))
    .slice(0, NOTIFICATION_LIMIT);
}

/** The bell: recent notices (client cancelled / rescheduled) and how many are unread. */
export class ListNotifications implements UseCase<void, NotificationListDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(): Promise<NotificationListDTO> {
    const actor = await requireActor(this.deps);
    const notifications = await visibleNotifications(this.deps, actor);
    const clientIds = [...new Set(notifications.map((notification) => notification.clientId))];
    const [professionals, services, clients] = await Promise.all([
      this.deps.professionals.listByBarbershop(actor.barbershopId),
      this.deps.services.listByBarbershop(actor.barbershopId),
      this.deps.clients.findByIds(clientIds),
    ]);
    const nameOf = (items: readonly { id: string; name: string }[], id: string) =>
      items.find((item) => item.id === id)?.name ?? '';

    const items = notifications.map((notification): NotificationDTO => ({
      id: notification.id,
      kind: notification.kind,
      appointmentId: notification.appointmentId,
      clientName: nameOf(clients, notification.clientId),
      professionalName: nameOf(professionals, notification.professionalId),
      serviceName: nameOf(services, notification.serviceId),
      previousStart: notification.previousStart.toISOString(),
      newStart: notification.newStart?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
      read: notification.isReadBy(actor.id),
    }));
    return { unreadCount: items.filter((item) => !item.read).length, items };
  }
}

/** "Marcar como lido" — only for the signed-in user. */
export class MarkNotificationRead implements UseCase<{ notificationId: string }, void> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: { notificationId: string }): Promise<void> {
    const actor = await requireActor(this.deps);
    const notification = await this.deps.notifications.findById(
      toId<NotificationId>(input.notificationId),
    );
    if (
      notification?.barbershopId !== actor.barbershopId ||
      !canManageAgendaOf(actor, notification.professionalId)
    ) {
      throw new NotFoundError('notification', input.notificationId);
    }
    await this.deps.notifications.save(notification.markReadBy(actor.id));
  }
}

/** "Marcar todos como lidos". */
export class MarkAllNotificationsRead implements UseCase<void, void> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(): Promise<void> {
    const actor = await requireActor(this.deps);
    const unread = (await visibleNotifications(this.deps, actor)).filter(
      (notification) => !notification.isReadBy(actor.id),
    );
    for (const notification of unread) {
      await this.deps.notifications.save(notification.markReadBy(actor.id));
    }
  }
}
