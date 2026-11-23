import type { NotificationKind } from '@domain/entities/Notification';

/** A panel notice, with names ready to show. Instants in ISO 8601. */
export interface NotificationDTO {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly appointmentId: string;
  readonly clientName: string;
  readonly professionalName: string;
  readonly serviceName: string;
  /** The time that became free. */
  readonly previousStart: string;
  /** Only when rescheduled. */
  readonly newStart: string | null;
  readonly createdAt: string;
  /** Read by the signed-in user. */
  readonly read: boolean;
}

export interface NotificationListDTO {
  readonly unreadCount: number;
  /** Newest first. */
  readonly items: readonly NotificationDTO[];
}
