import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors ' +
  'select-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-surface-2 text-fg hover:bg-surface-3',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-danger-strong text-white hover:bg-red-700',
};

/** Every size keeps the 44×44px minimum touch target. */
const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-14 px-6 text-lg',
};

/** Shared so links that look like buttons (router links) stay consistent. */
export function buttonClasses(
  options: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean } = {},
): string {
  const { variant = 'primary', size = 'md', fullWidth = false } = options;
  return cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full');
}
