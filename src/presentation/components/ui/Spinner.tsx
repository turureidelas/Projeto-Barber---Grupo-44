import { LoaderCircle } from 'lucide-react';
import { cx } from './cx';

interface SpinnerProps {
  readonly className?: string;
  /** Read by screen readers; omit when the surrounding text already says it. */
  readonly label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <>
      <LoaderCircle aria-hidden="true" className={cx('size-5 animate-spin', className)} />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}
