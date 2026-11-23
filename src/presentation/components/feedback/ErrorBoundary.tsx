import { CircleAlert, RefreshCw } from 'lucide-react';
import { Component, type ReactNode } from 'react';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from '../ui/Button';

interface ErrorBoundaryState {
  readonly crashed: boolean;
}

/**
 * Last line of defense against rendering bugs: a friendly screen instead of a blank page.
 * Nothing is logged here on purpose (the error could contain personal data — LGPD).
 */
export class ErrorBoundary extends Component<{ readonly children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { crashed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { crashed: true };
  }

  override render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <CircleAlert aria-hidden="true" className="size-12 text-danger" />
        <h1 className="text-2xl font-bold">{ptBR.pages.crashTitle}</h1>
        <p className="text-fg-muted">{ptBR.pages.crashBody}</p>
        <Button
          icon={RefreshCw}
          onClick={() => {
            window.location.reload();
          }}
        >
          {ptBR.pages.reload}
        </Button>
      </main>
    );
  }
}
