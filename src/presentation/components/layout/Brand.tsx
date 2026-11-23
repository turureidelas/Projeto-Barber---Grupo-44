import { Scissors } from 'lucide-react';
import { ptBR } from '../../i18n/pt-BR';
import { cx } from '../ui/cx';

export function Brand({ large = false }: { readonly large?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cx(
          'inline-flex items-center justify-center rounded-xl bg-accent text-accent-fg',
          large ? 'size-12' : 'size-9',
        )}
      >
        <Scissors className={large ? 'size-6' : 'size-5'} />
      </span>
      <span className={cx('font-extrabold tracking-tight', large ? 'text-3xl' : 'text-xl')}>
        {ptBR.app.name}
      </span>
    </span>
  );
}
