import type { ProfessionalDTO } from '@application/dto/catalog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ptBR } from '../../i18n/pt-BR';
import { Button, IconButton } from '../ui/Button';
import { cx } from '../ui/cx';

interface PeriodNavigatorProps {
  readonly label: string;
  readonly previousLabel: string;
  readonly nextLabel: string;
  /** "Hoje" / "Esta semana" — only shown when away from the current period. */
  readonly currentLabel: string;
  readonly isCurrent: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onCurrent: () => void;
}

/** ‹ Hoje › — moves between days or weeks. */
export function PeriodNavigator({
  label,
  previousLabel,
  nextLabel,
  currentLabel,
  isCurrent,
  onPrevious,
  onNext,
  onCurrent,
}: PeriodNavigatorProps) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1">
      <IconButton
        icon={ChevronLeft}
        label={previousLabel}
        variant="secondary"
        onClick={onPrevious}
      />
      {!isCurrent && (
        <Button variant="secondary" onClick={onCurrent}>
          {currentLabel}
        </Button>
      )}
      <IconButton icon={ChevronRight} label={nextLabel} variant="secondary" onClick={onNext} />
    </div>
  );
}

interface ProfessionalFilterProps {
  readonly professionals: readonly ProfessionalDTO[];
  readonly selectedId: string | null;
  readonly onSelect: (professionalId: string | null) => void;
  readonly label: string;
  /** Adds a "Todos" chip (selectedId = null). */
  readonly includeAll?: boolean;
}

/** Big chips (one tap) to pick whose agenda to see. */
export function ProfessionalFilter({
  professionals,
  selectedId,
  onSelect,
  label,
  includeAll = false,
}: ProfessionalFilterProps) {
  const options = [
    ...(includeAll ? [{ id: null, label: ptBR.today.allProfessionals }] : []),
    ...professionals.map((professional) => ({
      id: professional.id,
      label: professional.name.split(' ')[0] ?? professional.name,
    })),
  ];
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <button
            key={option.id ?? 'all'}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              onSelect(option.id);
            }}
            className={cx(
              'min-h-11 shrink-0 rounded-full border px-4 font-semibold transition-colors',
              selected
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-line-strong bg-surface-2 text-fg hover:bg-surface-3',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
