import { skipToken, useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { useUseCases } from './useUseCases';

/** Numbers of the period (both days included); null = not chosen yet. Professionals get only their own. */
export function useReport(period: { readonly from: string; readonly to: string } | null) {
  const { reports } = useUseCases();
  return useQuery({
    queryKey: queryKeys.report(period?.from ?? '', period?.to ?? ''),
    queryFn: period ? () => reports.getReport.execute(period) : skipToken,
  });
}
