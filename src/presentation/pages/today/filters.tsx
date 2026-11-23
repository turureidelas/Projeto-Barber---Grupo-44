import type { ProfessionalDTO } from '@application/dto/catalog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, IconButton } from '../../components/ui/Button';
import { cx } from '../../components/ui/cx';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.today;

interface DateNavigatorProps {
  readonly isToday: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onToday: () => void;
}

export function DateNavigator({ isToday, onPrevious, onNext, onToday }: DateNavigatorProps) {
  return (
    <div role="group" aria-label={t.dateNavigation} className="flex items-center gap-1">
      <IconButton
        icon={ChevronLeft}
        label={t.previousDay}
        variant="secondary"
        onClick={onPrevious}
      />
      {!isToday && (
        <Button variant="secondary" onClick={onToday}>
          {t.backToToday}
        </Button>
      )}
      <IconButton icon={ChevronRight} label={t.nextDay} variant="secondary" onClick={onNext} />
    </div>
  );
}

interface ProfessionalFilterProps {
  readonly professionals: readonly ProfessionalDTO[];
  readonly selectedId: string | null;
  readonly onSelect: (professionalId: string | null) => void;
}

/** Big chips (one tap) to see everyone or a single professional. */
export function ProfessionalFilter({
  professionals,
  selectedId,
  onSelect,
}: ProfessionalFilterProps) {
  const options = [
    { id: null, label: t.allProfessionals },
    ...professionals.map((professional) => ({
      id: professional.id,
      label: professional.name.split(' ')[0] ?? professional.name,
    })),
  ];
  return (
    <div
      role="group"
      aria-label={t.filterLabel}
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
