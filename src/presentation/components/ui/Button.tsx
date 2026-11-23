import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './button-styles';
import { cx } from './cx';
import { Spinner } from './Spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
  /** Shows a spinner and blocks clicks while an action runs. */
  readonly loading?: boolean;
  readonly icon?: LucideIcon;
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  icon: Icon,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={cx(buttonClasses({ variant, size, fullWidth }), className)}
      {...rest}
    >
      {loading ? <Spinner /> : Icon && <Icon aria-hidden="true" className="size-5 shrink-0" />}
      {children}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  readonly icon: LucideIcon;
  /** Required: icon-only buttons need an accessible name. */
  readonly label: string;
  readonly variant?: ButtonVariant;
}

export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(buttonClasses({ variant, size: 'icon' }), className)}
      {...rest}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
