import type { DailySummaryDTO } from '@application/dto/agenda';
import { formatMoney } from '@shared/format';
import { useId } from 'react';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.today.summary;

/** Big numbers, no charts: how the day is going. Revenue only for who may see it. */
export function DaySummary({ summary }: { readonly summary: DailySummaryDTO }) {
  const headingId = useId();
  const stats: { label: string; value: string }[] = [
    { label: t.appointments, value: String(summary.totalAppointments) },
    { label: t.completed, value: String(summary.completed) },
    { label: t.noShows, value: String(summary.noShows) },
  ];
  if (summary.revenueCents !== null) {
    stats.push({ label: t.revenue, value: formatMoney(summary.revenueCents) });
  }

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="sr-only">
        {t.title}
      </h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-card border border-line bg-surface px-4 py-3">
            <dt className="text-sm text-fg-muted">{stat.label}</dt>
            <dd className="text-2xl font-bold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
