import type { ReactNode } from 'react';
import { cx } from './cx';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-line-strong text-fg-muted',
  accent: 'border-accent/50 bg-accent/10 text-accent',
  success: 'border-success/40 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  danger: 'border-danger/40 bg-danger/10 text-danger',
  info: 'border-info/40 bg-info/10 text-info',
};

interface BadgeProps {
  readonly tone?: BadgeTone;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Short status label. Color is never the only signal — the text always says it. */
export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
