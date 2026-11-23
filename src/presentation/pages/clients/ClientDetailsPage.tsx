import type { ClientDetailsDTO } from '@application/dto/catalog';
import { formatDateTime, formatMoney, formatShortDate, isoToLocalDate } from '@shared/format';
import { ArrowLeft, Pencil, Phone, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, useParams } from 'react-router';
import { paths } from '../../app/routes';
import { StatusBadge } from '../../components/agenda/StatusBadge';
import { Button } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/button-styles';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/states';
import { useCatalogMutations, useClientDetails } from '../../hooks/useCatalog';
import { useCurrentUser } from '../../hooks/useSession';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';
import { ClientFormDialog } from './ClientFormDialog';

const t = ptBR.clients;

/** Full client record: contact, LGPD consent, numbers and history. */
export function ClientDetailsPage() {
  const { clientId = '' } = useParams();
  const details = useClientDetails(clientId);

  return (
    <div className="mx-auto max-w-4xl">
      <Link to={paths.clients} className={buttonClasses({ variant: 'ghost' }) + ' mb-2 -ml-3'}>
        <ArrowLeft aria-hidden="true" className="size-5" />
        {t.back}
      </Link>
      {details.isPending ? (
        <LoadingState />
      ) : details.isError ? (
        <ErrorState message={errorMessage(details.error)} onRetry={() => void details.refetch()} />
      ) : (
        <ClientRecord client={details.data} />
      )}
    </div>
  );
}

function ClientRecord({ client }: { readonly client: ClientDetailsDTO }) {
  const user = useCurrentUser();
  const mutations = useCatalogMutations();
  const [editing, setEditing] = useState(false);
  const numbersId = useId();
  const historyId = useId();
  // Money spent is financial data: only for who sees the reports (not the reception).
  const canSeeMoney = user.permissions.includes('reports:view-all');
  const { stats } = client;

  const numbers = [
    { label: t.visits, value: String(stats.visits) },
    { label: t.noShows, value: String(stats.noShows) },
    { label: t.cancellations, value: String(stats.cancellations) },
    {
      label: t.returnsEvery,
      value:
        stats.averageDaysBetweenVisits === null ? t.noData : t.days(stats.averageDaysBetweenVisits),
    },
    {
      label: t.lastVisit,
      value: stats.lastVisit ? formatShortDate(isoToLocalDate(stats.lastVisit)) : t.noData,
    },
    ...(canSeeMoney ? [{ label: t.totalSpent, value: formatMoney(stats.totalSpentCents) }] : []),
  ];

  return (
    <>
      <PageHeader
        title={client.name}
        subtitle={t.clientSince(formatShortDate(isoToLocalDate(client.createdAt)))}
        actions={
          <Button
            variant="secondary"
            icon={Pencil}
            onClick={() => {
              setEditing(true);
            }}
          >
            {ptBR.catalog.edit}
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t.contact}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xl font-semibold tabular-nums">{client.phone}</p>
            <a
              href={`tel:${client.phone.replace(/\D/g, '')}`}
              className={buttonClasses({ variant: 'secondary' })}
            >
              <Phone aria-hidden="true" className="size-5" />
              {t.call}
            </a>
          </div>
          {client.email && <p>{client.email}</p>}
          {client.consent ? (
            <p className="flex items-center gap-2 text-success">
              <ShieldCheck aria-hidden="true" className="size-5 shrink-0" />
              {t.consentGiven(
                formatShortDate(isoToLocalDate(client.consent.grantedAt)),
                t.channels[client.consent.channel],
              )}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-warning">
              <ShieldAlert aria-hidden="true" className="size-5 shrink-0" />
              {t.consentMissing}
            </p>
          )}
        </Card>

        <section aria-labelledby={numbersId}>
          <h2 id={numbersId} className="mb-2 text-lg font-bold">
            {t.numbers}
          </h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {numbers.map((item) => (
              <div
                key={item.label}
                className="rounded-card border border-line bg-surface px-4 py-3"
              >
                <dt className="text-sm text-fg-muted">{item.label}</dt>
                <dd className="text-2xl font-bold tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby={historyId}>
          <h2 id={historyId} className="mb-2 text-lg font-bold">
            {t.history}
          </h2>
          {client.history.length === 0 ? (
            <p className="text-fg-muted">{t.noHistory}</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {client.history.map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-line bg-surface p-3"
                >
                  <span className="font-semibold tabular-nums">
                    {formatDateTime(appointment.start)}
                  </span>
                  <span className="flex-1">
                    {appointment.serviceName} ·{' '}
                    {ptBR.today.withProfessional(appointment.professionalName)}
                  </span>
                  {canSeeMoney && appointment.payment && (
                    <span className="tabular-nums">
                      {formatMoney(appointment.payment.amountPaidCents)}
                    </span>
                  )}
                  <StatusBadge status={appointment.status} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <ClientFormDialog
        open={editing}
        client={client}
        pending={mutations.updateClient.isPending}
        onClose={() => {
          setEditing(false);
        }}
        onSubmit={({ consentGiven: _ignored, ...input }) => {
          mutations.updateClient.mutate(
            { clientId: client.id, ...input },
            {
              onSuccess: () => {
                setEditing(false);
              },
            },
          );
        }}
      />
    </>
  );
}
