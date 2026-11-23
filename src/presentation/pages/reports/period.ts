import { addDaysToLocalDate, isLocalDateString, startOfMonth, startOfWeek } from '@shared/format';

/** Period choices of the reports screen and how they look in the URL (pt-BR, no personal data). */
export const PERIOD_PRESETS = ['today', 'week', 'month', 'custom'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_PARAM = 'periodo';
export const FROM_PARAM = 'de';
export const TO_PARAM = 'ate';

const URL_VALUES: Readonly<Record<PeriodPreset, string>> = {
  today: 'hoje',
  week: 'semana',
  month: 'mes',
  custom: 'datas',
};

export const DEFAULT_PRESET: Exclude<PeriodPreset, 'custom'> = 'week';
/** Same limit as the domain (MAX_REPORT_DAYS). */
const MAX_DAYS = 366;

export type CustomPeriodError = 'missing' | 'reversed' | 'tooLong';

export interface ResolvedPeriod {
  readonly preset: PeriodPreset;
  readonly from: string | null;
  readonly to: string | null;
  /** Custom dates that can't be reported yet; null when the period is ready. */
  readonly error: CustomPeriodError | null;
}

export function presetToParam(preset: PeriodPreset): string {
  return URL_VALUES[preset];
}

function presetFromParam(value: string | null): PeriodPreset {
  return PERIOD_PRESETS.find((preset) => URL_VALUES[preset] === value) ?? DEFAULT_PRESET;
}

/** "Esta semana" and "Este mês" go up to today, so the numbers aren't diluted by the future. */
export function presetRange(
  preset: Exclude<PeriodPreset, 'custom'>,
  today: string,
): { from: string; to: string } {
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: startOfWeek(today), to: today };
    case 'month':
      return { from: startOfMonth(today), to: today };
  }
}

export function validateCustomPeriod(from: string, to: string): CustomPeriodError | null {
  if (!isLocalDateString(from) || !isLocalDateString(to)) return 'missing';
  if (to < from) return 'reversed';
  if (addDaysToLocalDate(from, MAX_DAYS - 1) < to) return 'tooLong';
  return null;
}

/** Reads ?periodo=hoje|semana|mes|datas&de=yyyy-MM-dd&ate=yyyy-MM-dd. */
export function resolvePeriod(params: URLSearchParams, today: string): ResolvedPeriod {
  const preset = presetFromParam(params.get(PERIOD_PARAM));
  if (preset !== 'custom') {
    return { preset, ...presetRange(preset, today), error: null };
  }
  const from = params.get(FROM_PARAM) ?? '';
  const to = params.get(TO_PARAM) ?? '';
  const error = validateCustomPeriod(from, to);
  return {
    preset,
    from: isLocalDateString(from) ? from : null,
    to: isLocalDateString(to) ? to : null,
    error,
  };
}
