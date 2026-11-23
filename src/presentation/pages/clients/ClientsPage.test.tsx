import { at } from '@domain/testing/builders';
import { createTestApp, fixture } from '@main/testing/createTestApp';
import { renderApp } from '@main/testing/renderApp';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/** Fixture clients: João Pedro (11) 98765-4321 joao@email.demo; Maria Antônia (11) 91234-5678. */

describe('ClientsPage', () => {
  it('lists clients with masked contacts and filters by name', async () => {
    const { user } = await renderApp({ as: 'receptionist', route: '/clientes' });

    const table = await screen.findByRole('table', { name: 'Clientes da barbearia' });
    expect(within(table).getByText('(11) *****-4321')).toBeInTheDocument();
    expect(within(table).getByText('j***@email.demo')).toBeInTheDocument();
    expect(within(table).queryByText('(11) 98765-4321')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Buscar cliente'), 'antonia');
    expect(await screen.findByRole('link', { name: 'Maria Antônia' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'João Pedro' })).not.toBeInTheDocument();
    });
  });

  it('registers a client only with consent, and refuses a repeated phone', async () => {
    const { user } = await renderApp({ as: 'receptionist', route: '/clientes' });

    await user.click(await screen.findByRole('button', { name: 'Novo cliente' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo cliente' });
    await user.type(within(dialog).getByLabelText('Nome'), 'Pedro Alves');
    await user.type(within(dialog).getByLabelText('Telefone com DDD'), '119');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findByText(/Digite o telefone com DDD/)).toBeInTheDocument();
    expect(
      within(dialog).getByText('Para cadastrar, o cliente precisa autorizar.'),
    ).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Telefone com DDD'));
    await user.type(within(dialog).getByLabelText('Telefone com DDD'), '(11) 98765-4321');
    await user.click(within(dialog).getByRole('checkbox', { name: /autorizou guardar/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Já existe um cliente com esse telefone.')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Telefone com DDD'));
    await user.type(within(dialog).getByLabelText('Telefone com DDD'), '(11) 97777-1234');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Pedro Alves cadastrado.')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Pedro Alves' })).toBeInTheDocument();
  });

  it('opens the full record with numbers and history', async () => {
    const app = createTestApp();
    await app.signInAs('owner');
    const booked = await app.useCases.agenda.scheduleAppointment.execute({
      professionalId: fixture.ricardo,
      clientId: fixture.joao,
      serviceId: fixture.haircut,
      start: at('10:00').toISOString(),
    });
    await app.useCases.agenda.completeAppointment.execute({
      appointmentId: booked.id,
      amountPaidCents: 5000,
      paymentMethod: 'PIX',
    });
    const { user } = await renderApp({ app, route: '/clientes' });

    await user.click(await screen.findByRole('link', { name: 'João Pedro' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'João Pedro' }),
    ).toBeInTheDocument();
    expect(screen.getByText('(11) 98765-4321')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ligar' })).toHaveAttribute('href', 'tel:11987654321');
    expect(screen.getByText(/Sem autorização registrada/)).toBeInTheDocument();

    const numbers = screen.getByRole('region', { name: 'Números do cliente' });
    expect(within(numbers).getByText('Visitas').nextSibling).toHaveTextContent('1');
    expect(within(numbers).getByText('Total gasto').nextSibling).toHaveTextContent(/R\$\s50,00/);
    const history = screen.getByRole('region', { name: 'Histórico' });
    expect(within(history).getByText('Concluído')).toBeInTheDocument();
  });

  it('hides money from the reception and lets them edit contact data', async () => {
    const { user } = await renderApp({ as: 'receptionist', route: `/clientes/${fixture.maria}` });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Maria Antônia' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Total gasto')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar cliente' });
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('E-mail (opcional)'), 'maria@email.demo');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Alterações salvas.')).toBeInTheDocument();
    expect(await screen.findByText('maria@email.demo')).toBeInTheDocument();
  });

  it('registers a new client while booking', async () => {
    const { user } = await renderApp({ as: 'receptionist', route: '/semana' });

    await user.click(await screen.findByRole('button', { name: 'Novo agendamento' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo agendamento' });
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar novo cliente' }));
    await user.type(within(dialog).getByLabelText('Nome'), 'Carlos Novo');
    await user.type(within(dialog).getByLabelText('Telefone com DDD'), '11966665555');
    await user.click(within(dialog).getByRole('checkbox', { name: /autorizou guardar/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar cliente' }));

    expect(await screen.findByText('Carlos Novo cadastrado.')).toBeInTheDocument();
    expect(await within(dialog).findByText('(11) *****-5555')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Trocar cliente' })).toBeInTheDocument();
  });

  it('erases the client data at their request, after confirmation (owner only)', async () => {
    const { user } = await renderApp({ as: 'owner', route: `/clientes/${fixture.joao}` });

    await user.click(await screen.findByRole('button', { name: 'Apagar dados do cliente' }));
    const dialog = await screen.findByRole('dialog', { name: 'Apagar os dados de João Pedro?' });
    await user.click(within(dialog).getByRole('button', { name: 'Apagar dados' }));

    expect(await screen.findByText('Dados do cliente apagados.')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cliente anonimizado' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/foram apagados a pedido dele em 18\/11/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ligar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('does not offer erasing data to the reception', async () => {
    await renderApp({ as: 'receptionist', route: `/clientes/${fixture.joao}` });
    await screen.findByRole('heading', { level: 1, name: 'João Pedro' });
    expect(
      screen.queryByRole('button', { name: 'Apagar dados do cliente' }),
    ).not.toBeInTheDocument();
  });
});
