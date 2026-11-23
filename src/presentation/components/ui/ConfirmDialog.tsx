import { ptBR } from '../../i18n/pt-BR';
import { Button } from './Button';
import type { ButtonVariant } from './button-styles';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  readonly variant?: ButtonVariant;
  readonly pending?: boolean;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

/** Yes/no question before an action that is hard to undo. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = ptBR.common.cancel,
  variant = 'primary',
  pending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={variant} loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
