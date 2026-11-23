import { initials } from '@shared/format';
import { cx } from './cx';

interface AvatarProps {
  readonly name: string;
  readonly photoUrl?: string | null;
  readonly size?: 'sm' | 'md';
  readonly className?: string;
}

/** Photo or initials. Decorative: the name is always shown next to it. */
export function Avatar({ name, photoUrl, size = 'md', className }: AvatarProps) {
  const sizing = size === 'sm' ? 'size-8 text-xs' : 'size-11 text-sm';
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={cx('shrink-0 rounded-full object-cover', sizing, className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-surface-3 font-bold text-accent',
        sizing,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
