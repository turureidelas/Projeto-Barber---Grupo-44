import { renderApp } from '@main/testing/renderApp';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/** Fixture: Corte (30 min, R$ 45), Barba (30 min, R$ 35), combo Corte + Barba, inactive Luzes. */

const row = (name: string) => {
  const cell = screen.getByText(name, { selector: 'p' });
  const tr = cell.closest('tr');
  if (!tr) throw new Error(`row ${name} not found`);
  return tr;
};

describe('ServicesPage', () => {
  it('lists services and combos, including deactivated ones', async () => {
    await renderApp({ as: 'owner', route: '/servicos' });

    const table = await screen.findByRole('table', { name: 'Serviços e combos da barbearia' });
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    expect(within(row('Corte + Barba')).getByText('Combo: Corte + Barba')).toBeInTheDocument();
    expect(within(row('Corte + Barba')).getByText('1h')).toBeInTheDocument();
    expect(within(row('Luzes')).getByText('Desativado')).toBeInTheDocument();
    expect(within(row('Corte')).getByText(/R\$\s45,00/)).toBeInTheDocument();
  });

  it('creates a service, validating name and price', async () => {
    const { user } = await renderApp({ as: 'owner', route: '/servicos' });

    await user.click(await screen.findByRole('button', { name: 'Novo serviço' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo serviço' });
    await user.type(within(dialog).getByLabelText('Preço (R$)'), 'abc');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findByText('Digite o nome.')).toBeInTheDocument();
    expect(within(dialog).getByText('Digite o preço, por exemplo 45,00.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Nome'), 'Sobrancelha');
    await user.selectOptions(within(dialog).getByLabelText('Duração'), '15');
    await user.clear(within(dialog).getByLabelText('Preço (R$)'));
    await user.type(within(dialog).getByLabelText('Preço (R$)'), '15');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Sobrancelha cadastrado.')).toBeInTheDocument();
    expect(within(await screen.findByRole('table')).getByText('Sobrancelha')).toBeInTheDocument();
    expect(within(row('Sobrancelha')).getByText('15 min')).toBeInTheDocument();
  });

  it('creates a combo from at least two services, showing the separate price', async () => {
    const { user } = await renderApp({ as: 'owner', route: '/servicos' });

    await user.click(await screen.findByRole('button', { name: 'Novo combo' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo combo' });
    await user.type(within(dialog).getByLabelText('Nome'), 'Barba + Corte especial');
    await user.type(within(dialog).getByLabelText('Preço (R$)'), '72,50');
    await user.click(within(dialog).getByRole('checkbox', { name: /^Corte/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(
      await within(dialog).findByText('Escolha pelo menos dois serviços.'),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('checkbox', { name: /^Barba/ }));
    expect(within(dialog).getByText(/Separados, custariam R\$\s80,00\./)).toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText('Duração'), '60');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Barba + Corte especial cadastrado.')).toBeInTheDocument();
    expect(within(row('Barba + Corte especial')).getByText(/R\$\s72,50/)).toBeInTheDocument();
  });

  it('edits the price and deactivates a service', async () => {
    const { user } = await renderApp({ as: 'owner', route: '/servicos' });

    await user.click(await screen.findByRole('button', { name: 'Editar Corte' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar serviço' });
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Corte');
    await user.clear(within(dialog).getByLabelText('Preço (R$)'));
    await user.type(within(dialog).getByLabelText('Preço (R$)'), '50');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Alterações salvas.')).toBeInTheDocument();
    expect(await within(row('Corte')).findByText(/R\$\s50,00/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Desativar Corte' }));
    expect(await screen.findByText('Corte foi desativado.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Ativar Corte' })).toBeInTheDocument();
  });

  it('is only for the owner', async () => {
    await renderApp({ as: 'receptionist', route: '/servicos' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sem acesso' }),
    ).toBeInTheDocument();
  });
});
