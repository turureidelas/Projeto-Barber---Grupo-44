import { formatShortDate } from '@shared/format';
import { ChartColumn } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/states';
import { useToday } from '../../hooks/useNow';
import { useReport } from '../../hooks/useReports';
import { useCurrentUser } from '../../hooks/useSession';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';
import { PeriodFilter } from './PeriodFilter';
import {
  DEFAULT_PRESET,
  FROM_PARAM,
  PERIOD_PARAM,
  presetRange,
  presetToParam,
  resolvePeriod,
  TO_PARAM,
  type PeriodPreset,
} from './period';
import { ReportView } from './ReportView';

const t = ptBR.reports;

/**
 * "Relatórios" for the owner, "Meus números" for a professional (the use case already limits
 * the data to their own). The period lives in the URL: ?periodo=hoje|semana|mes|datas&de=&ate=.
 */
export function ReportsPage() {
  const user = useCurrentUser();
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const period = resolvePeriod(params, today);
  const ready =
    period.error === null && period.from && period.to ? { from: period.from, to: period.to } : null;
  const report = useReport(ready);
  const own = !user.permissions.includes('reports:view-all');

  const choosePreset = (preset: PeriodPreset) => {
    if (preset === DEFAULT_PRESET) {
      setParams({}, { replace: true });
    } else if (preset === 'custom') {
      // Start from the period on screen, so the dates only need a small change.
      const current = ready ?? presetRange(DEFAULT_PRESET, today);
      setParams(
        {
          [PERIOD_PARAM]: presetToParam('custom'),
          [FROM_PARAM]: current.from,
          [TO_PARAM]: current.to,
        },
        { replace: true },
      );
    } else {
      setParams({ [PERIOD_PARAM]: presetToParam(preset) }, { replace: true });
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={own ? t.ownTitle : t.title}
        subtitle={
          ready ? t.periodRange(formatShortDate(ready.from), formatShortDate(ready.to)) : undefined
        }
      />
      <PeriodFilter
        period={period}
        onPreset={choosePreset}
        onCustom={(from, to) => {
          setParams(
            { [PERIOD_PARAM]: presetToParam('custom'), [FROM_PARAM]: from, [TO_PARAM]: to },
            { replace: true },
          );
        }}
      />
      {ready === null ? null : report.isPending ? (
        <LoadingState />
      ) : report.isError ? (
        <ErrorState message={errorMessage(report.error)} onRetry={() => void report.refetch()} />
      ) : report.data.totals.appointments === 0 ? (
        <EmptyState icon={ChartColumn} title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <ReportView report={report.data} />
      )}
    </div>
  );
}
