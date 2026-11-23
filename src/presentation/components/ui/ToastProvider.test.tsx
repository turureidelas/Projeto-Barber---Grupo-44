import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useToast } from '../../hooks/useToast';
import { ToastProvider } from './ToastProvider';

function Trigger() {
  const toast = useToast();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          toast.success('Horário bloqueado');
        }}
      >
        ok
      </button>
      <button
        type="button"
        onClick={() => {
          toast.error('Já tem cliente marcado nesse horário.');
        }}
      >
        erro
      </button>
    </>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastProvider', () => {
  it('announces success as status and errors as alert', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'ok' }));
    await userEvent.click(screen.getByRole('button', { name: 'erro' }));
    expect(screen.getByRole('status')).toHaveTextContent('Horário bloqueado');
    expect(screen.getByRole('alert')).toHaveTextContent('Já tem cliente marcado nesse horário.');
  });

  it('can be dismissed and disappears on its own', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'ok' }));
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByText('Horário bloqueado')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ok' }));
    expect(screen.getByText('Horário bloqueado')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('Horário bloqueado')).not.toBeInTheDocument();
  });

  it('requires the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
  });
});
