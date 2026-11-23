import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from './Badge';
import { Button, IconButton } from './Button';
import { SelectField, TextField } from './fields';
import { Modal } from './Modal';
import { EmptyState, ErrorState, LoadingState } from './states';

describe('Button', () => {
  it('is a non-submitting button by default', () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'button');
  });

  it('blocks clicks and announces progress while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Salvar
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('gives icon-only buttons an accessible name', () => {
    render(<IconButton icon={Plus} label="Novo agendamento" />);
    expect(screen.getByRole('button', { name: 'Novo agendamento' })).toBeInTheDocument();
  });
});

describe('fields', () => {
  it('links label, hint and error to the input', () => {
    const { rerender } = render(<TextField label="Telefone" hint="Com DDD" />);
    const input = screen.getByLabelText('Telefone');
    expect(input).toHaveAccessibleDescription('Com DDD');
    expect(input).not.toHaveAttribute('aria-invalid');

    rerender(<TextField label="Telefone" hint="Com DDD" error="Telefone inválido" />);
    expect(screen.getByLabelText('Telefone')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Telefone')).toHaveAccessibleDescription('Telefone inválido');
    expect(screen.getByRole('alert')).toHaveTextContent('Telefone inválido');
  });

  it('renders a labelled select with its options', () => {
    render(
      <SelectField
        label="Forma de pagamento"
        options={[
          { value: 'PIX', label: 'Pix' },
          { value: 'CASH', label: 'Dinheiro' },
        ]}
      />,
    );
    const select = screen.getByLabelText('Forma de pagamento');
    expect(select).toHaveDisplayValue('Pix');
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });
});

describe('Modal', () => {
  it('is a named dialog with a close button', async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Cancelar horário?" description="O cliente será avisado." onClose={onClose}>
        corpo
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Cancelar horário?' });
    expect(dialog).toHaveAccessibleDescription('O cliente será avisado.');
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders no content while closed', () => {
    render(
      <Modal open={false} title="Oculto" onClose={vi.fn()}>
        corpo
      </Modal>,
    );
    expect(screen.queryByText('corpo')).not.toBeInTheDocument();
  });
});

describe('states and badges', () => {
  it('announces loading', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
  });

  it('shows errors with a retry action', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Falhou" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('explains empty screens', () => {
    render(<EmptyState icon={Plus} title="Nenhum cliente" description="Cadastre o primeiro." />);
    expect(screen.getByText('Nenhum cliente')).toBeInTheDocument();
    expect(screen.getByText('Cadastre o primeiro.')).toBeInTheDocument();
  });

  it('always says the status in text', () => {
    render(<Badge tone="success">Concluído</Badge>);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });
});
