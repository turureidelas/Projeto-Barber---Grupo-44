import { at } from '@domain/testing/builders';
import { createTestApp, fixture, type TestApp } from '@main/testing/createTestApp';
import { renderApp } from '@main/testing/renderApp';
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

/** Wednesday 18/11/2026 08:00. Default policy: 2h notice, 15 min tolerance. */
let app: TestApp;

beforeEach(async () => {
  app = createTestApp();
  await app.signInAs('owner');
});

function book(time: string, professionalId: string = fixture.bruno) {
  return app.useCases.agenda.scheduleAppointment.execute({
    professionalId,
    clientId: fixture.joao,
    serviceId: fixture.haircut,
    start: at(time).toISOString(),
  });
}

/** The shell renders the bell in the sidebar and in the phone top bar (CSS shows one). */
const bell = (name: string | RegExp) => {
  const [first] = screen.getAllByRole('button', { name });
  if (!first) throw new Error('bell not found');
  return first;
};

describe('SettingsPage', () => {
  it('saves the barbershop details, checking the phone first', async () => {
    const { user } = await renderApp({ app, route: '/configuracoes' });
    const shop = await screen.findByRole('region', { name: 'Dados da barbearia' });

    const name = within(shop).getByLabelText('Nome da barbearia');
    expect(name).toHaveValue('Barbearia Nova Era');
    await user.clear(name);
    await user.type(name, 'Nova Era Barbearia');
    const phone = within(shop).getByLabelText('Telefone com DDD');
    await user.clear(phone);
    await user.type(phone, '1134');
    await user.click(within(shop).getByRole('button', { name: 'Salvar' }));
    expect(await within(shop).findByText(/Digite o telefone com DDD/)).toBeInTheDocument();

    await user.clear(phone);
    await user.type(phone, '(11) 2222-3333');
    await user.type(within(shop).getByLabelText('Endereço'), 'Rua A, 10');
    await user.click(within(shop).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Dados da barbearia salvos.')).toBeInTheDocument();
    await expect(app.useCases.catalog.getBarbershop.execute()).resolves.toMatchObject({
      name: 'Nova Era Barbearia',
      phone: '(11) 2222-3333',
      address: 'Rua A, 10',
    });
  });

  it('changes the cancellation policy within the allowed limits', async () => {
    const { user } = await renderApp({ app, route: '/configuracoes' });
    const policy = await screen.findByRole('region', { name: 'Política de cancelamento' });

    const notice = within(policy).getByLabelText(/Antecedência mínima/);
    expect(notice).toHaveValue('2');
    await user.clear(notice);
    await user.type(notice, '200');
    await user.click(within(policy).getByRole('button', { name: 'Salvar' }));
    expect(await within(policy).findByText('Digite um número de 0 a 168 horas.')).toBeVisible();

    await user.clear(notice);
    await user.type(notice, '3');
    const tolerance = within(policy).getByLabelText(/Tolerância/);
    await user.clear(tolerance);
    await user.type(tolerance, '10');
    await user.click(within(policy).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Política de cancelamento salva.')).toBeInTheDocument();
    await expect(app.useCases.catalog.getBarbershop.execute()).resolves.toMatchObject({
      cancellationPolicy: { minNoticeHours: 3, noShowToleranceMinutes: 10 },
    });
    expect(
      await screen.findByText(/o cliente só pode cancelar ou remarcar até 3h antes/),
    ).toBeInTheDocument();
  });

  it('simulates the client cancelling: the notice arrives in the bell', async () => {
    await book('14:00');
    const { user } = await renderApp({ app, route: '/configuracoes' });

    const list = await screen.findByRole('list', {
      name: 'Agendamentos que o cliente pode mudar',
    });
    await user.click(
      within(list).getByRole('button', {
        name: 'João Pedro cancela o horário de qua, 18/11 às 14:00',
      }),
    );

    expect(
      await screen.findByText('João Pedro cancelou pelo app. Veja o aviso no sino.'),
    ).toBeInTheDocument();
    await user.click(await waitFor(() => bell('Avisos, 1 não lido')));

    const dialog = await screen.findByRole('dialog', { name: 'Avisos' });
    expect(within(dialog).getByRole('heading', { name: /João Pedro cancelou/ })).toBeVisible();
    expect(
      within(dialog).getByText('Corte com Bruno, qua, 18/11 às 14:00. O horário ficou livre.'),
    ).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Marcar como lido' }));
    await waitFor(() => {
      expect(bell('Avisos')).toBeInTheDocument();
    });
    expect(within(dialog).getByRole('button', { name: 'Marcar todos como lidos' })).toBeDisabled();
  });

  it('simulates the client rescheduling to a free time', async () => {
    await book('14:00');
    const { user } = await renderApp({ app, route: '/configuracoes' });

    await user.click(
      await screen.findByRole('button', {
        name: 'João Pedro remarca o horário de qua, 18/11 às 14:00',
      }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Remarcar' });
    expect(within(dialog).queryByLabelText('Profissional')).not.toBeInTheDocument();
    await user.click(await within(dialog).findByRole('radio', { name: '17:00' }));
    await user.click(within(dialog).getByRole('button', { name: 'Remarcar' }));

    expect(
      await screen.findByText(
        'João Pedro remarcou para qua, 18/11 às 17:00. Veja o aviso no sino.',
      ),
    ).toBeInTheDocument();
    await user.click(await waitFor(() => bell('Avisos, 1 não lido')));
    const notices = await screen.findByRole('dialog', { name: 'Avisos' });
    expect(within(notices).getByRole('heading', { name: /João Pedro remarcou/ })).toBeVisible();
  });

  it('refuses a change after the notice period with a friendly message', async () => {
    await book('09:30');
    const { user } = await renderApp({ app, route: '/configuracoes' });

    const list = await screen.findByRole('list', {
      name: 'Agendamentos que o cliente pode mudar',
    });
    expect(within(list).getByText('Fora do prazo')).toBeInTheDocument();
    await user.click(within(list).getByRole('button', { name: /cancela o horário/ }));
    expect(await screen.findByText('Passou do prazo para cancelar ou remarcar.')).toBeVisible();
    expect(bell('Avisos')).toBeInTheDocument();
  });
});

describe('NotificationBell', () => {
  it('shows each person only the notices of the agendas they handle', async () => {
    const brunos = await book('14:00');
    const ricardos = await book('15:00', fixture.ricardo);
    const demo = app.useCases.demo;
    if (!demo) throw new Error('demo mode expected');
    await demo.simulateClientCancel.execute({ appointmentId: brunos.id });
    await demo.simulateClientCancel.execute({ appointmentId: ricardos.id });

    const { user } = await renderApp({ app, as: 'barber', route: '/' });
    await user.click(await waitFor(() => bell('Avisos, 1 não lido')));
    const dialog = await screen.findByRole('dialog', { name: 'Avisos' });
    expect(within(dialog).getAllByRole('article')).toHaveLength(1);
    expect(within(dialog).getByText(/Corte com Bruno/)).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Marcar todos como lidos' }));
    await waitFor(() => {
      expect(bell('Avisos')).toBeInTheDocument();
    });
  });

  it('has an empty state', async () => {
    const { user } = await renderApp({ app, as: 'receptionist', route: '/' });
    await user.click(await waitFor(() => bell('Avisos')));
    expect(await screen.findByText('Nenhum aviso por enquanto.')).toBeVisible();
  });
});
