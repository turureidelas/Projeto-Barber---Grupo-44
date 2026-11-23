import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useIsDemo, useResetDemo } from '../../hooks/useDemo';
import { useToast } from '../../hooks/useToast';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from '../ui/Button';
import type { ButtonVariant } from '../ui/button-styles';
import { Modal } from '../ui/Modal';

/** "Resetar dados de demonstração", with confirmation. Renders nothing outside demo mode. */
export function ResetDemoButton({ variant = 'ghost' }: { readonly variant?: ButtonVariant }) {
  const isDemo = useIsDemo();
  const reset = useResetDemo();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  if (!isDemo) return null;

  const confirm = () => {
    reset.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        toast.success(ptBR.demo.resetDone);
      },
      onError: (error) => {
        toast.error(errorMessage(error));
      },
    });
  };

  return (
    <>
      <Button
        variant={variant}
        icon={RotateCcw}
        fullWidth
        onClick={() => {
          setConfirming(true);
        }}
      >
        {ptBR.demo.reset}
      </Button>
      <Modal
        open={confirming}
        onClose={() => {
          setConfirming(false);
        }}
        title={ptBR.demo.resetConfirmTitle}
        description={ptBR.demo.resetConfirmBody}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirming(false);
              }}
            >
              {ptBR.common.cancel}
            </Button>
            <Button variant="danger" loading={reset.isPending} onClick={confirm}>
              {reset.isPending ? ptBR.demo.resetting : ptBR.demo.reset}
            </Button>
          </>
        }
      />
    </>
  );
}
