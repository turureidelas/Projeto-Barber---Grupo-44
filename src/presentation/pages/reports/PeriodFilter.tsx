import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { cx } from '../../components/ui/cx';
import { TextField } from '../../components/ui/fields';
import { ptBR } from '../../i18n/pt-BR';
import {
  PERIOD_PRESETS,
  validateCustomPeriod,
  type CustomPeriodError,
  type PeriodPreset,
  type ResolvedPeriod,
} from './period';

const t = ptBR.reports;

const PRESET_LABELS: Readonly<Record<PeriodPreset, string>> = {
  today: t.presets.today,
  week: t.presets.week,
  month: t.presets.month,
  custom: t.presets.custom,
};

const ERROR_MESSAGES: Readonly<Record<CustomPeriodError, string>> = {
  missing: t.invalidDates,
  reversed: t.reversedDates,
  tooLong: t.tooLong,
};

interface PeriodFilterProps {
  readonly period: ResolvedPeriod;
  readonly onPreset: (preset: PeriodPreset) => void;
  readonly onCustom: (from: string, to: string) => void;
}

/** Hoje · Esta semana · Este mês · Escolher datas (with start and end dates). */
export function PeriodFilter({ period, onPreset, onCustom }: PeriodFilterProps) {
  return (
    <div className="mb-5 flex flex-col gap-4">
      <div
        role="group"
        aria-label={t.periodLabel}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {PERIOD_PRESETS.map((preset) => {
          const selected = preset === period.preset;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                onPreset(preset);
              }}
              className={cx(
                'min-h-11 shrink-0 rounded-full border px-4 font-semibold transition-colors',
                selected
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-line-strong bg-surface-2 text-fg hover:bg-surface-3',
              )}
            >
              {PRESET_LABELS[preset]}
            </button>
          );
        })}
      </div>
      {period.preset === 'custom' && (
        <CustomDatesForm
          // Remount when the URL changes so the fields show what is being reported.
          key={`${period.from ?? ''}_${period.to ?? ''}`}
          from={period.from ?? ''}
          to={period.to ?? ''}
          onSubmit={onCustom}
        />
      )}
    </div>
  );
}

interface CustomDatesFormProps {
  readonly from: string;
  readonly to: string;
  readonly onSubmit: (from: string, to: string) => void;
}

function CustomDatesForm(props: CustomDatesFormProps) {
  const [from, setFrom] = useState(props.from);
  const [to, setTo] = useState(props.to);
  const [error, setError] = useState<CustomPeriodError | null>(null);

  return (
    <form
      noValidate
      aria-label={t.customTitle}
      onSubmit={(event) => {
        event.preventDefault();
        const problem = validateCustomPeriod(from, to);
        setError(problem);
        if (problem === null) props.onSubmit(from, to);
      }}
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-md">
        <TextField
          type="date"
          label={t.from}
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
          }}
        />
        <TextField
          type="date"
          label={t.to}
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
          }}
        />
      </div>
      <Button type="submit">{t.apply}</Button>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger sm:basis-full">
          {ERROR_MESSAGES[error]}
        </p>
      )}
    </form>
  );
}
