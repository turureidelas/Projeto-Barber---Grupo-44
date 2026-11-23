import type { ReactNode } from 'react';
import { cx } from '../ui/cx';

/**
 * Hand-made charts (no chart library). The numbers are always written as text next to the
 * bars, so the bars themselves are decorative (aria-hidden) and screen readers read the list.
 */

interface MeterProps {
  /** 0–100. */
  readonly percent: number;
  readonly className?: string;
}

/** A single horizontal bar, e.g. how full the agenda was. */
export function Meter({ percent, className }: MeterProps) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cx('h-2.5 w-full overflow-hidden rounded-full', className)}
      preserveAspectRatio="none"
    >
      <rect width="100%" height="100%" rx="5" className="fill-surface-3" />
      {width > 0 && (
        <rect width={`${String(width)}%`} height="100%" rx="5" className="fill-accent" />
      )}
    </svg>
  );
}

export interface BarItem {
  readonly key: string;
  readonly label: ReactNode;
  /** What the bar is proportional to. */
  readonly value: number;
  /** The value as people read it, e.g. "12 vezes" or "R$ 450,00". */
  readonly valueText: string;
}

interface BarListProps {
  readonly items: readonly BarItem[];
  /** Visible description of what is being compared (also names the list). */
  readonly caption: string;
}

/** Ranking with bars proportional to the largest value. */
export function BarList({ items, caption }: BarListProps) {
  const max = Math.max(...items.map((item) => item.value), 0);
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-sm text-fg-muted">{caption}</figcaption>
      <ol className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-medium">{item.label}</span>
              <span className="shrink-0 font-semibold tabular-nums">{item.valueText}</span>
            </div>
            <Meter percent={max === 0 ? 0 : (item.value / max) * 100} />
          </li>
        ))}
      </ol>
    </figure>
  );
}
