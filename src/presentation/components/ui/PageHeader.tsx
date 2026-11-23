import { useEffect, type ReactNode } from 'react';
import { ptBR } from '../../i18n/pt-BR';

interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly actions?: ReactNode;
}

/**
 * The single <h1> of each screen. Also names the browser tab, and can receive focus
 * (tabIndex -1) so screen readers announce the new screen after navigating.
 */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} · ${ptBR.app.name}`;
  }, [title]);

  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1
          tabIndex={-1}
          className="text-2xl font-bold tracking-tight focus:outline-none sm:text-3xl"
        >
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-fg-muted first-letter:uppercase">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
