import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ptBR } from '../../i18n/pt-BR';
import { cx } from './cx';
import { ToastContext, type ToastAction, type ToastApi, type ToastTone } from './toast-context';

interface Toast {
  readonly id: number;
  readonly tone: ToastTone;
  readonly message: string;
  readonly action: ToastAction | undefined;
}

const DURATION_MS = 4500;
/** Toasts with an action ("Desfazer") stay longer so there is time to tap it. */
const ACTION_DURATION_MS = 8000;

/**
 * Feedback for one-tap actions. Announced by screen readers (aria-live) and placed above the
 * mobile bottom navigation.
 */
export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (tone: ToastTone, message: string, action?: ToastAction) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current.slice(-2), { id, tone, message, action }]);
      setTimeout(
        () => {
          dismiss(id);
        },
        action ? ACTION_DURATION_MS : DURATION_MS,
      );
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, options) => {
        show('success', message, options?.action);
      },
      error: (message) => {
        show('error', message);
      },
    }),
    [show],
  );

  return (
    <ToastContext value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((toast) => {
          const Icon = toast.tone === 'success' ? CircleCheck : CircleAlert;
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className={cx(
                'pointer-events-auto flex w-full max-w-md animate-toast-in items-center gap-3 rounded-xl border bg-surface-2 py-2 pr-2 pl-4 shadow-lg',
                toast.tone === 'success' ? 'border-success/50' : 'border-danger/60',
              )}
            >
              <Icon
                aria-hidden="true"
                className={cx(
                  'size-5 shrink-0',
                  toast.tone === 'success' ? 'text-success' : 'text-danger',
                )}
              />
              <p className="flex-1 font-medium">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="min-h-11 rounded-lg px-3 font-bold text-accent hover:bg-surface-3"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label={ptBR.common.close}
                onClick={() => {
                  dismiss(toast.id);
                }}
                className="inline-flex size-11 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-3"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
