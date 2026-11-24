import type { AppointmentDTO } from '@application/dto/agenda';
import { formatDateTime } from '@shared/format';
import { CalendarPlus, History } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { paths } from '../../app/routes';
import { ClientRescheduleDialog } from '../../components/client-area/ClientRescheduleDialog';
import {
  MyAppointmentCard,
  PastAppointmentItem,
} from '../../components/client-area/MyAppointmentCard';
import { buttonClasses } from '../../components/ui/button-styles';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/states';
import { useClientBookingActions, useMyAppointments } from '../../hooks/useClientArea';
import { useNow, useToday } from '../../hooks/useNow';
import { useCurrentUser } from '../../hooks/useSession';
import { useBarbershop } from '../../hooks/useSettings';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.clientArea.home;

/** Client home: the next appointment first, then the others and the history. */
export function MyAppointmentsPage() {
  const user = useCurrentUser();
  const mine = useMyAppointments();
  const barbershop = useBarbershop();
  const actions = useClientBookingActions();
  const now = useNow();
  const today = useToday();
  const [cancelling, setCancelling] = useState<AppointmentDTO | null>(null);
  const [moving, setMoving] = useState<AppointmentDTO | null>(null);

  const firstName = user.name.split(' ')[0] ?? user.name;
  const bookLink = (
    <Link to={paths.client.book} className={buttonClasses({ size: 'lg' })}>
      <CalendarPlus aria-hidden="true" className="size-5" />
      {t.book}
    </Link>
  );

  return (
    <>
      <PageHeader title={t.title} subtitle={t.hello(firstName)} actions={bookLink} />

      {mine.isPending ? (
        <LoadingState />
      ) : mine.isError ? (
        <ErrorState message={errorMessage(mine.error)} onRetry={() => void mine.refetch()} />
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="next-heading" className="flex flex-col gap-3">
            <h2 id="next-heading" className="text-lg font-bold">
              {t.next}
            </h2>
            {mine.data.upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarPlus}
                title={t.emptyTitle}
                description={t.emptyBody}
                action={bookLink}
              />
            ) : (
              mine.data.upcoming.map((appointment, index) => (
                <div key={appointment.id} className="flex flex-col gap-3">
                  {index === 1 && <h3 className="mt-2 font-bold">{t.otherUpcoming}</h3>}
                  <MyAppointmentCard
                    appointment={appointment}
                    now={now}
                    highlight={index === 0}
                    shopPhone={barbershop.data?.phone ?? null}
                    cancelling={
                      actions.cancel.isPending && actions.cancel.variables.id === appointment.id
                    }
                    onCancel={setCancelling}
                    onReschedule={setMoving}
                  />
                </div>
              ))
            )}
          </section>

          <section aria-labelledby="history-heading" className="flex flex-col gap-3">
            <h2 id="history-heading" className="text-lg font-bold">
              {t.history}
            </h2>
            {mine.data.past.length === 0 ? (
              <p className="flex items-center gap-2 text-fg-muted">
                <History aria-hidden="true" className="size-5" />
                {t.noHistory}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {mine.data.past.map((appointment) => (
                  <li key={appointment.id}>
                    <PastAppointmentItem appointment={appointment} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={cancelling !== null}
        title={t.cancelTitle}
        description={
          cancelling ? t.cancelBody(cancelling.serviceName, formatDateTime(cancelling.start)) : ''
        }
        confirmLabel={t.cancelConfirm}
        cancelLabel={t.keep}
        variant="danger"
        pending={actions.cancel.isPending}
        onClose={() => {
          setCancelling(null);
        }}
        onConfirm={() => {
          if (!cancelling) return;
          actions.cancel.mutate(cancelling, {
            onSettled: () => {
              setCancelling(null);
            },
          });
        }}
      />

      <ClientRescheduleDialog
        appointment={moving}
        today={today}
        pending={actions.reschedule.isPending}
        onClose={() => {
          setMoving(null);
        }}
        onConfirm={(start) => {
          if (!moving) return;
          actions.reschedule.mutate(
            { appointment: moving, start },
            {
              onSuccess: () => {
                setMoving(null);
              },
            },
          );
        }}
      />
    </>
  );
}
