import { renderApp } from '@main/testing/renderApp';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/** Fixture: Ricardo (100%) and Bruno (40%), both Mon–Fri 09:00–19:00, Sat 09:00–14:00. */

const card = async (name: string) => {
  const heading = await screen.findByRole('heading', { level: 2, name });
  const element = heading.closest('li');
  if (!element) throw new Error(`card ${name} not found`);
  return element;
};

describe('ProfessionalsPage', () => {
  it('shows each professional with commission and weekly hours', async () => {
    await renderApp({ as: 'owner', route: '/equipe' });

    const bruno = await card('Bruno Santos');
    expect(within(bruno).getByText('Comissão: 40%')).toBeInTheDocument();
    expect((await within(bruno).findByText('qua')).parentElement).toHaveTextContent(
      'qua 09:00–19:00',
    );
    expect(within(bruno).getByText('sáb').parentElement).toHaveTextContent('sáb 09:00–14:00');
    expect(within(bruno).getByText('Ativo')).toBeInTheDocument();
  });

  it('registers a professional and goes straight to the schedule', async () => {
    const { user } = await renderApp({ as: 'owner', route: '/equipe' });

    await user.click(await screen.findByRole('button', { name: 'Novo profissional' }));
    const form = await screen.findByRole('dialog', { name: 'Novo profissional' });
    await user.type(within(form).getByLabelText('Nome'), 'Diego Lima');
    await user.clear(within(form).getByLabelText('Comissão (%)'));
    await user.type(within(form).getByLabelText('Comissão (%)'), '160');
    await user.click(within(form).getByRole('button', { name: 'Salvar' }));
    expect(await within(form).findByText('Digite um número de 0 a 100.')).toBeInTheDocument();

    await user.clear(within(form).getByLabelText('Comissão (%)'));
    await user.type(within(form).getByLabelText('Comissão (%)'), '60');
    await user.click(within(form).getByRole('button', { name: 'Salvar' }));

    const schedule = await screen.findByRole('dialog', { name: 'Escala de Diego Lima' });
    await user.click(within(schedule).getByRole('checkbox', { name: 'Quarta-feira · Trabalha' }));
    const wednesday = within(schedule).getByRole('group', { name: 'Quarta-feira' });
    await user.selectOptions(within(wednesday).getByLabelText('Início'), '10:00');
    await user.selectOptions(within(wednesday).getByLabelText('Fim'), '09:00');
    await user.click(within(schedule).getByRole('button', { name: 'Salvar' }));
    expect(
      await within(wednesday).findByText('O fim precisa ser depois do início.'),
    ).toBeInTheDocument();

    await user.selectOptions(within(wednesday).getByLabelText('Fim'), '18:00');
    await user.selectOptions(within(wednesday).getByLabelText('Intervalo das'), '12:00');
    await user.click(within(schedule).getByRole('button', { name: 'Salvar' }));
    expect(
      await within(wednesday).findByText('Escolha o início e o fim do intervalo.'),
    ).toBeInTheDocument();

    await user.selectOptions(within(wednesday).getByLabelText('até'), '13:00');
    await user.click(within(schedule).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Escala de Diego Lima salva.')).toBeInTheDocument();
    const diego = await card('Diego Lima');
    expect((await within(diego).findByText('qua')).parentElement).toHaveTextContent(
      'qua 10:00–18:00',
    );
    expect(within(diego).getByText('Comissão: 60%')).toBeInTheDocument();
  });

  it('edits data and deactivates a professional', async () => {
    const { user } = await renderApp({ as: 'owner', route: '/equipe' });

    await user.click(await screen.findByRole('button', { name: 'Editar dados de Bruno Santos' }));
    const form = await screen.findByRole('dialog', { name: 'Editar profissional' });
    await user.type(within(form).getByLabelText('Especialidade (opcional)'), 'Degradê');
    await user.click(within(form).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Alterações salvas.')).toBeInTheDocument();
    expect(await within(await card('Bruno Santos')).findByText('Degradê')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Desativar Bruno Santos' }));
    expect(await screen.findByText('Bruno Santos foi desativado.')).toBeInTheDocument();
    expect(await within(await card('Bruno Santos')).findByText('Desativado')).toBeInTheDocument();
  });
});
