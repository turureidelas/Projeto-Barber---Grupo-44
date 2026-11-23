import { at } from '@domain/testing/builders';
import { createTestApp, fixture, type TestApp } from '@main/testing/createTestApp';
import { renderApp } from '@main/testing/renderApp';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/** Wednesday 2026-11-18. Ricardo & Bruno work 09:00–19:00. Clients: João Pedro, Maria Antônia. */

async function book(
  app: TestApp,
  time: string,
  options: { professionalId?: string; clientId?: string; date?: string } = {},
) {
  await app.signInAs('owner');
  return app.useCases.agenda.scheduleAppointment.execute({
    professionalId: options.professionalId ?? fixture.ricardo,
    clientId: options.clientId ?? fixture.joao,
    serviceId: fixture.haircut,
    start: at(time, options.date).toISOString(),
  });
}

/** João with Ricardo at 10:00, Maria with Bruno at 11:00. */
async function busyMorning(now = at('08:00')) {
  const app = createTestApp();
  await book(app, '10:00');
  await book(app, '11:00', { professionalId: fixture.bruno, clientId: fixture.maria });
  app.clock.set(now);
  return app;
}

const money = (value: string) => new RegExp(`R\\$\\s${value}`);

describe('TodayPage', () => {
  it('explains an empty day', async () => {
    await renderApp({ as: 'owner' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Agenda de hoje' }),
    ).toBeInTheDocument();
    expect(screen.getByText('quarta-feira, 18 de novembro')).toBeInTheDocument();
    expect(await screen.findByText('Nenhum horário marcado neste dia')).toBeInTheDocument();
  });

  it('highlights the next client and lists the day in order', async () => {
    const app = await busyMorning();
    await renderApp({ app, as: 'owner' });

    const next = await screen.findByRole('region', { name: 'Próximo cliente' });
    expect(within(next).getByText('10:00')).toBeInTheDocument();
    expect(within(next).getByText('João Pedro')).toBeInTheDocument();
    expect(within(next).getByText('Corte · com Ricardo Almeida')).toBeInTheDocument();
    expect(within(next).getByText('(11) *****-4321')).toBeInTheDocument();

    const schedule = screen.getByRole('region', { name: 'Horários do dia' });
    const rows = within(schedule).getAllByRole('article');
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      '10:00 · João Pedro',
      '11:00 · Maria Antônia',
    ]);
  });

  it('marks arrival with one tap and moves on to the next client', async () => {
    const app = await busyMorning();
    const { user } = await renderApp({ app, as: 'owner' });

    const [arrived] = await screen.findAllByRole('button', { name: 'Compareceu: João Pedro' });
    if (!arrived) throw new Error('button not found');
    await user.click(arrived);

    expect(await screen.findByText('João Pedro está em atendimento.')).toBeInTheDocument();
    const inService = await screen.findByRole('region', { name: 'Em atendimento agora' });
    expect(within(inService).getByText('João Pedro')).toBeInTheDocument();
    const next = screen.getByRole('region', { name: 'Próximo cliente' });
    expect(within(next).getByText('Maria Antônia')).toBeInTheDocument();
  });

  it('completes with the amount received and the payment method', async () => {
    const app = await busyMorning();
    const { user } = await renderApp({ app, as: 'owner' });

    const [complete] = await screen.findAllByRole('button', { name: 'Concluir: João Pedro' });
    if (!complete) throw new Error('button not found');
    await user.click(complete);

    const dialog = await screen.findByRole('dialog', { name: 'Concluir atendimento' });
    expect(dialog).toHaveAccessibleDescription('João Pedro · Corte');
    const amount = within(dialog).getByLabelText('Valor recebido (R$)');
    expect(amount).toHaveValue('45,00');
    expect(within(dialog).getByRole('radio', { name: 'Pix' })).toBeChecked();

    await user.clear(amount);
    await user.type(amount, 'abc');
    await user.click(within(dialog).getByRole('button', { name: 'Concluir atendimento' }));
    expect(
      await within(dialog).findByText('Digite o valor, por exemplo 45,00.'),
    ).toBeInTheDocument();

    await user.clear(amount);
    await user.type(amount, '50');
    await user.click(within(dialog).getByRole('radio', { name: 'Dinheiro' }));
    await user.click(within(dialog).getByRole('button', { name: 'Concluir atendimento' }));

    expect(await screen.findByText(/Atendimento de João Pedro concluído/)).toBeInTheDocument();
    const row = await screen.findByRole('article', { name: '10:00 · João Pedro' });
    expect(await within(row).findByText(/Pago R\$\s50,00 · Dinheiro/)).toBeInTheDocument();
    expect(within(row).getByText('Concluído')).toBeInTheDocument();
    const revenue = screen.getByText('Faturado').closest('div');
    expect(revenue).toHaveTextContent(money('50,00'));
  });

  it('only allows "Faltou" after the tolerance, and explains when', async () => {
    const app = await busyMorning(at('10:05'));
    await renderApp({ app, as: 'owner' });

    const next = await screen.findByRole('region', { name: 'Próximo cliente' });
    expect(within(next).getByRole('button', { name: 'Faltou: João Pedro' })).toBeDisabled();
    expect(within(next).getByText('Dá para marcar falta a partir das 10:15.')).toBeInTheDocument();
  });

  it('records a no-show with one tap and can undo it from the notice', async () => {
    const app = await busyMorning(at('10:20'));
    const { user } = await renderApp({ app, as: 'owner' });

    const next = await screen.findByRole('region', { name: 'Próximo cliente' });
    await user.click(within(next).getByRole('button', { name: 'Faltou: João Pedro' }));

    expect(await screen.findByText('Falta registrada para João Pedro.')).toBeInTheDocument();
    const row = screen.getByRole('article', { name: '10:00 · João Pedro' });
    expect(await within(row).findByText('Cliente faltou')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(await screen.findByText('Pronto, a falta foi desfeita.')).toBeInTheDocument();
    expect(await within(row).findByText('Em atendimento')).toBeInTheDocument();
  });

  it('lets the receptionist filter by professional, without revenue', async () => {
    const app = await busyMorning();
    const { user } = await renderApp({ app, as: 'receptionist' });

    const filter = await screen.findByRole('group', { name: 'Ver a agenda de' });
    expect(within(filter).getByRole('button', { name: 'Todos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByText('Faturado')).not.toBeInTheDocument();

    await user.click(within(filter).getByRole('button', { name: 'Bruno' }));
    expect(within(filter).getByRole('button', { name: 'Bruno' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const next = await screen.findByRole('region', { name: 'Próximo cliente' });
    expect(await within(next).findByText('Maria Antônia')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: '10:00 · João Pedro' })).not.toBeInTheDocument();
  });

  it('shows a barber only their own day, without the professional filter', async () => {
    const app = await busyMorning();
    await renderApp({ app, as: 'barber' });

    expect(
      await screen.findByRole('article', { name: '11:00 · Maria Antônia' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: '10:00 · João Pedro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Ver a agenda de' })).not.toBeInTheDocument();
    expect(screen.getByText('Faturado')).toBeInTheDocument();
  });

  it('moves to other days and back to today', async () => {
    const app = createTestApp();
    await book(app, '10:00', { date: '2026-11-19' });
    const { user } = await renderApp({ app, as: 'owner' });

    await screen.findByText('Nenhum horário marcado neste dia');
    await user.click(screen.getByRole('button', { name: 'Próximo dia' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Agenda do dia' }),
    ).toBeInTheDocument();
    expect(screen.getByText('quinta-feira, 19 de novembro')).toBeInTheDocument();
    expect(await screen.findByRole('article', { name: '10:00 · João Pedro' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Próximo cliente' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Agenda de hoje' }),
    ).toBeInTheDocument();
  });

  it('opens a day from the URL', async () => {
    const app = createTestApp();
    await book(app, '10:00', { date: '2026-11-19' });
    await renderApp({ app, as: 'owner', route: '/?dia=2026-11-19' });
    expect(await screen.findByRole('article', { name: '10:00 · João Pedro' })).toBeInTheDocument();
  });

  it('hides cancelled appointments until asked, and shows blocked times', async () => {
    const app = await busyMorning();
    const [first] = (await app.useCases.agenda.getDailyAgenda.execute({ date: '2026-11-18' }))
      .appointments;
    if (!first) throw new Error('missing appointment');
    await app.useCases.agenda.cancelAppointment.execute({ appointmentId: first.id, reason: null });
    await app.useCases.agenda.blockTime.execute({
      professionalId: fixture.ricardo,
      start: at('15:00').toISOString(),
      end: at('16:00').toISOString(),
      reason: 'Médico',
    });
    const { user } = await renderApp({ app, as: 'owner' });

    const blocked = (await screen.findByText('Horário bloqueado')).closest('p');
    expect(blocked).toHaveTextContent('Horário bloqueado · Médico · com Ricardo Almeida');
    expect(screen.queryByRole('article', { name: '10:00 · João Pedro' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mostrar cancelados (1)' }));
    const cancelled = screen.getByRole('article', { name: '10:00 · João Pedro' });
    expect(within(cancelled).getByText('Cancelado')).toBeInTheDocument();
  });
});
