import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ptBR } from '../../i18n/pt-BR';
import { IconButton } from './Button';

interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string;
  readonly children?: ReactNode;
  /** Action buttons, stacked on phones and aligned right on larger screens. */
  readonly footer?: ReactNode;
}

/**
 * Native <dialog>: focus trap, Esc to close and inert background for free.
 * Bottom sheet on phones (easy to reach with the thumb), centered card on larger screens.
 */
export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-0 mt-auto w-full max-w-none rounded-t-card border border-line bg-surface p-0 text-fg sm:m-auto sm:max-w-lg sm:rounded-card"
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-start gap-3 border-b border-line p-4 sm:p-5">
            <div className="flex-1">
              <h2 id={titleId} className="text-xl font-bold">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-fg-muted">
                  {description}
                </p>
              )}
            </div>
            <IconButton
              icon={X}
              label={ptBR.common.close}
              onClick={onClose}
              className="-mt-1 -mr-2"
            />
          </header>
          {children && <div className="overflow-y-auto p-4 sm:p-5">{children}</div>}
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-line p-4 sm:flex-row sm:flex-wrap sm:justify-end sm:p-5 sm:[&>*]:whitespace-nowrap">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
