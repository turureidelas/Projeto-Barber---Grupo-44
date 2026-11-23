import { CircleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from './Button';
import { Spinner } from './Spinner';

/** Loading, empty and error states — every screen must handle all three. */

export function LoadingState({ label = ptBR.common.loading }: { readonly label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-fg-muted">
      <Spinner className="size-6 text-accent" />
      <span>{label}</span>
    </div>
  );
}

interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line px-6 py-12 text-center">
      <Icon aria-hidden="true" className="size-10 text-fg-muted" />
      <p className="text-lg font-semibold">{title}</p>
      {description && <p className="max-w-sm text-fg-muted">{description}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  readonly message: string;
  readonly onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-card border border-danger/40 bg-danger/5 px-6 py-10 text-center"
    >
      <CircleAlert aria-hidden="true" className="size-10 text-danger" />
      <p className="text-lg font-semibold">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {ptBR.common.retry}
        </Button>
      )}
    </div>
  );
}
