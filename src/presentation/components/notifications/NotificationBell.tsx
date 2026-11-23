import type { NotificationDTO } from '@application/dto/notifications';
import { formatDateTime } from '@shared/format';
import { Bell, CalendarClock, CalendarX } from 'lucide-react';
import { useState } from 'react';
import { useNotificationActions, useNotifications } from '../../hooks/useNotifications';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from '../ui/Button';
import { buttonClasses } from '../ui/button-styles';
import { cx } from '../ui/cx';
import { Modal } from '../ui/Modal';
import { ErrorState, LoadingState } from '../ui/states';

const t = ptBR.notifications;

/** Bell with the unread count; opens the list of notices (client cancelled / rescheduled). */
export function NotificationBell({ className }: { readonly className?: string }) {
  const notifications = useNotifications();
  const actions = useNotificationActions();
  const [open, setOpen] = useState(false);
  const unread = notifications.data?.unreadCount ?? 0;

  return (
    <>
      <button
        type="button"
        aria-label={t.open(unread)}
        title={t.open(unread)}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true);
        }}
        className={cx(buttonClasses({ variant: 'ghost', size: 'icon' }), 'relative', className)}
      >
        <Bell aria-hidden="true" className="size-6" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 flex min-w-5 items-center justify-center rounded-full bg-danger-strong px-1 text-xs leading-5 font-bold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title={t.title}
        description={t.description}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
              }}
            >
              {ptBR.common.close}
            </Button>
            <Button
              disabled={unread === 0}
              loading={actions.markAllRead.isPending}
              onClick={() => {
                actions.markAllRead.mutate();
              }}
            >
              {t.markAllRead}
            </Button>
          </>
        }
      >
        {notifications.isPending ? (
          <LoadingState />
        ) : notifications.isError ? (
          <ErrorState
            message={errorMessage(notifications.error)}
            onRetry={() => void notifications.refetch()}
          />
        ) : notifications.data.items.length === 0 ? (
          <p className="py-6 text-center text-fg-muted">{t.empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notifications.data.items.map((notification) => (
              <li key={notification.id}>
                <NotificationItem
                  notification={notification}
                  pending={
                    actions.markRead.isPending && actions.markRead.variables === notification.id
                  }
                  onMarkRead={() => {
                    actions.markRead.mutate(notification.id);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}

interface NotificationItemProps {
  readonly notification: NotificationDTO;
  readonly pending: boolean;
  readonly onMarkRead: () => void;
}

function NotificationItem({ notification, pending, onMarkRead }: NotificationItemProps) {
  const cancelled = notification.kind === 'APPOINTMENT_CANCELLED';
  const Icon = cancelled ? CalendarX : CalendarClock;
  const { clientName, serviceName, professionalName } = notification;
  const professional = professionalName.split(' ')[0] ?? professionalName;

  return (
    <article
      className={cx(
        'flex gap-3 rounded-card border p-3',
        notification.read ? 'border-line bg-surface' : 'border-accent/50 bg-accent/5',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cx('mt-0.5 size-6 shrink-0', cancelled ? 'text-danger' : 'text-info')}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="font-bold">
          {cancelled ? t.cancelled(clientName) : t.rescheduled(clientName)}
          {!notification.read && <span className="sr-only"> ({t.unread})</span>}
        </h3>
        <p>
          {notification.newStart === null
            ? t.cancelledBody(serviceName, professional, formatDateTime(notification.previousStart))
            : t.rescheduledBody(
                serviceName,
                professional,
                formatDateTime(notification.previousStart),
                formatDateTime(notification.newStart),
              )}
        </p>
        <p className="text-sm text-fg-muted">
          {t.receivedAt(formatDateTime(notification.createdAt))}
        </p>
        {!notification.read && (
          <Button
            variant="ghost"
            className="-ml-3 self-start"
            loading={pending}
            onClick={onMarkRead}
          >
            {t.markRead}
          </Button>
        )}
      </div>
    </article>
  );
}
