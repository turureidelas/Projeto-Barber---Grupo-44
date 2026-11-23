import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cx } from './cx';

/** Semantic table primitives for wide screens (cadastros, relatórios). */

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Visible to screen readers: what the table lists. */
  readonly caption: string;
}

export function Table({ caption, className, children, ...rest }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className={cx('w-full border-collapse text-left', className)} {...rest}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cx(
        'border-b border-line bg-surface-2 px-4 py-3 text-sm font-semibold text-fg-muted',
        className,
      )}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx('border-b border-line px-4 py-3', className)} {...rest} />;
}
