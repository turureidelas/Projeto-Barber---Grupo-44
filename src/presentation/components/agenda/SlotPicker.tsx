import type { SlotDTO } from '@application/dto/agenda';
import { formatTime } from '@shared/format';
import { useId } from 'react';
import { ptBR } from '../../i18n/pt-BR';
import { cx } from '../ui/cx';
import { Spinner } from '../ui/Spinner';

interface SlotPickerProps {
  readonly slots: readonly SlotDTO[] | undefined;
  readonly loading: boolean;
  readonly selected: string | null;
  readonly onSelect: (start: string) => void;
  readonly error?: string | undefined;
}

/**
 * Only free times (from the availability engine) can be picked — no trial and error.
 * Native radio buttons styled as big tiles: keyboard and screen-reader friendly.
 */
export function SlotPicker({ slots, loading, selected, onSelect, error }: SlotPickerProps) {
  const name = useId();
  const errorId = useId();

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-semibold">{ptBR.slots.label}</legend>
      {loading ? (
        <p role="status" className="flex items-center gap-2 text-fg-muted">
          <Spinner className="text-accent" />
          {ptBR.slots.loading}
        </p>
      ) : !slots || slots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-3 text-fg-muted">
          {ptBR.slots.none}
        </p>
      ) : (
        <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
          {slots.map((slot) => {
            const checked = slot.start === selected;
            return (
              <label
                key={slot.start}
                className={cx(
                  'flex min-h-11 cursor-pointer items-center justify-center rounded-xl border font-semibold tabular-nums transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent',
                  checked
                    ? 'border-accent bg-accent text-accent-fg'
                    : 'border-line-strong bg-surface-2 hover:bg-surface-3',
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={slot.start}
                  checked={checked}
                  onChange={() => {
                    onSelect(slot.start);
                  }}
                  className="sr-only"
                />
                {formatTime(slot.start)}
              </label>
            );
          })}
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
