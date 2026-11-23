import type { ReportDTO, ReportProfessionalDTO } from '@application/dto/reports';
import { formatMoney } from '@shared/format';
import { useId, type ReactNode } from 'react';
import { BarList, Meter } from '../../components/reports/charts';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.reports;

const percentText = (value: number | null) => (value === null ? t.noData : t.percent(value));

/** Big numbers first, then the breakdowns. Only shows what the use case computed. */
export function ReportView({ report }: { readonly report: ReportDTO }) {
  const { totals } = report;
  const own = report.scope === 'PROFESSIONAL' ? report.professionals[0] : undefined;
  const expected = totals.completed + totals.noShows;

  return (
    <div className="flex flex-col gap-6">
      <Section title={t.highlights}>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label={t.revenue} value={formatMoney(totals.revenueCents)} hint={t.revenueHint} />
          <Stat
            label={own ? t.commissionOwn(own.commissionPercent) : t.commissionAll}
            value={formatMoney(totals.commissionCents)}
            hint={own ? t.commissionOwnHint : t.commissionAllHint}
          />
          <Stat
            label={t.occupancy}
            value={percentText(totals.occupancyPercent)}
            hint={t.occupancyHint}
            meter={totals.occupancyPercent}
          />
          <Stat
            label={t.noShows}
            value={percentText(totals.noShowPercent)}
            hint={expected > 0 ? t.noShowsHint(totals.noShows, expected) : undefined}
          />
          <Stat
            label={t.completed}
            value={String(totals.completed)}
            hint={t.completedHint(totals.cancellations)}
          />
          <Stat
            label={t.averageTicket}
            value={
              totals.averageTicketCents === null ? t.noData : formatMoney(totals.averageTicketCents)
            }
            hint={t.averageTicketHint}
          />
        </dl>
      </Section>

      {report.scope === 'BARBERSHOP' && report.professionals.length > 0 && (
        <Section title={t.byProfessional}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.professionals.map((professional) => (
              <li key={professional.id}>
                <ProfessionalCard professional={professional} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {report.services.length > 0 && (
          <Section title={t.topServices} card>
            <BarList
              caption={t.topServicesCaption}
              items={report.services.map((service) => ({
                key: service.id,
                label: service.name,
                value: service.count,
                valueText: t.timesBooked(service.count),
              }))}
            />
          </Section>
        )}

        <Section title={t.clients} card>
          <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <SmallStat label={t.clientsServed} value={String(report.clients.served)} />
            <SmallStat
              label={t.clientsReturning}
              value={
                report.clients.returningPercent === null
                  ? t.noData
                  : t.clientsReturningValue(
                      t.percent(report.clients.returningPercent),
                      report.clients.returning,
                    )
              }
              hint={t.clientsReturningHint}
            />
            <SmallStat
              label={t.clientsAverageGap}
              value={
                report.clients.averageDaysBetweenVisits === null
                  ? t.noData
                  : t.days(report.clients.averageDaysBetweenVisits)
              }
            />
          </dl>
        </Section>

        {report.payments.length > 0 && (
          <Section title={t.payments} card>
            <BarList
              caption={t.paymentsCaption}
              items={report.payments.map((payment) => ({
                key: payment.method,
                label: ptBR.paymentMethods[payment.method],
                value: payment.amountCents,
                valueText: t.paymentValue(formatMoney(payment.amountCents), payment.count),
              }))}
            />
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  card = false,
  children,
}: {
  readonly title: string;
  readonly card?: boolean;
  readonly children: ReactNode;
}) {
  const id = useId();
  const heading = (
    <h2 id={id} className="mb-3 text-lg font-bold">
      {title}
    </h2>
  );
  return (
    <section aria-labelledby={id}>
      {card ? (
        <Card>
          {heading}
          {children}
        </Card>
      ) : (
        <>
          {heading}
          {children}
        </>
      )}
    </section>
  );
}

interface StatProps {
  readonly label: string;
  readonly value: string;
  readonly hint?: string | undefined;
  /** Shows a bar under the number (0–100). */
  readonly meter?: number | null;
}

/** Big number card. */
function Stat({ label, value, hint, meter }: StatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
      <dt className="text-sm font-medium text-fg-muted">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums sm:text-3xl">{value}</dd>
      {typeof meter === 'number' && (
        <dd>
          <Meter percent={meter} className="mt-1" />
        </dd>
      )}
      {hint && <dd className="text-sm text-fg-muted">{hint}</dd>}
    </div>
  );
}

function SmallStat({ label, value, hint }: Omit<StatProps, 'meter'>) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
      {hint && <dd className="text-sm text-fg-muted">{hint}</dd>}
    </div>
  );
}

function ProfessionalCard({ professional }: { readonly professional: ReportProfessionalDTO }) {
  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={professional.name} photoUrl={professional.photoUrl} />
        <h3 className="font-bold">{professional.name}</h3>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <SmallStat label={t.professionalRevenue} value={formatMoney(professional.revenueCents)} />
        <SmallStat
          label={t.professionalCommission(professional.commissionPercent)}
          value={formatMoney(professional.commissionCents)}
        />
        <SmallStat label={t.professionalCompleted} value={String(professional.completed)} />
        <SmallStat label={t.professionalNoShows} value={percentText(professional.noShowPercent)} />
      </dl>
      <div className="flex flex-col gap-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-fg-muted">{t.professionalOccupancy}</span>
          <span className="font-bold tabular-nums">
            {percentText(professional.occupancyPercent)}
          </span>
        </p>
        <Meter percent={professional.occupancyPercent ?? 0} />
        <p className="text-sm text-fg-muted">
          {t.bookedOfAvailable(professional.bookedMinutes, professional.availableMinutes)}
        </p>
      </div>
    </Card>
  );
}
