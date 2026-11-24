import { useId } from 'react';
import { cx } from '../ui/cx';

export interface Choice {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

interface ChoiceGroupProps {
  readonly legend: string;
  readonly choices: readonly Choice[];
  readonly selected: string | null;
  readonly onSelect: (value: string) => void;
  /** 'list': one per row (long texts). 'grid': small tiles side by side (days). */
  readonly layout?: 'list' | 'grid';
}

/**
 * One choice among a few, as big tap targets. Native radio buttons underneath: keyboard
 * (arrow keys) and screen readers work as usual.
 */
export function ChoiceGroup({
  legend,
  choices,
  selected,
  onSelect,
  layout = 'list',
}: ChoiceGroupProps) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-lg font-bold">{legend}</legend>
      <div
        className={cx(
          'grid gap-2',
          layout === 'grid' ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2',
        )}
      >
        {choices.map((choice, index) => {
          const checked = choice.value === selected;
          const labelId = `${name}-${String(index)}`;
          const descriptionId = `${labelId}-description`;
          return (
            <label
              key={choice.value}
              className={cx(
                'flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border px-4 py-2 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent',
                layout === 'grid' && 'items-center px-2 text-center',
                checked
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-line-strong bg-surface-2 hover:bg-surface-3',
              )}
            >
              <input
                type="radio"
                name={name}
                value={choice.value}
                checked={checked}
                aria-labelledby={labelId}
                aria-describedby={choice.description ? descriptionId : undefined}
                onChange={() => {
                  onSelect(choice.value);
                }}
                className="sr-only"
              />
              <span id={labelId} className="font-semibold">
                {choice.label}
              </span>
              {choice.description && (
                <span
                  id={descriptionId}
                  className={cx('text-sm', checked ? 'text-accent-fg/80' : 'text-fg-muted')}
                >
                  {choice.description}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
