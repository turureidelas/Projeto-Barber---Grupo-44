import { at } from '@domain/testing/builders';
import { createTestApp, fixture, type TestApp } from '@main/testing/createTestApp';
import { renderApp } from '@main/testing/renderApp';
import { formatMoney } from '@shared/format';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Wed 18/11/2026: Ricardo cut João's hair (45,00 Pix); Bruno did Maria's combo (70,00 cash). */
let app: TestApp;

beforeEach(async () => {
  app = createTestApp();
  await app.signInAs('owner');
  const book = (time: string, professionalId: string, clientId: string, serviceId: string) =>
    app.useCases.agenda.scheduleAppointment.execute({
      professionalId,
      clientId,
      serviceId,
      start: at(time).toISOString(),
    });
  const haircut = await book('09:00', fixture.ricardo, fixture.joao, fixture.haircut);
  const combo = await book('10:00', fixture.bruno, fixture.maria, fixture.combo);
  await app.useCases.agenda.completeAppointment.execute({
    appointmentId: haircut.id,
    amountPaidCents: 4500,
    paymentMethod: 'PIX',
  });
  await app.useCases.agenda.completeAppointment.execute({
    appointmentId: combo.id,
    amountPaidCents: 7000,
    paymentMethod: 'CASH',
  });
});

/** The number shown under a card label (<dt>label</dt><dd>value</dd>). */
function stat(label: string | RegExp, container: HTMLElement = document.body) {
  const term = within(container).getByText(label, { selector: 'dt' });
  return term.nextElementSibling?.textContent;
}

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

describe('ReportsPage', () => {
  it("shows the owner this week's numbers, total and per professional", async () => {
    await renderApp({ app, route: '/relatorios' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible();
    expect(screen.getByText('16/11 a 18/11')).toBeInTheDocument();
    expect(pressed('Esta semana')).toBe('true');

    const summary = await screen.findByRole('region', { name: 'Resumo do período' });
    expect(stat('Faturamento', summary)).toBe(formatMoney(11500));
    // Ricardo keeps 100% of 45,00 and Bruno 40% of 70,00.
    expect(stat('Comissões', summary)).toBe(formatMoney(4500 + 2800));
    expect(stat('Atendimentos', summary)).toBe('2');
    expect(stat('Valor médio', summary)).toBe(formatMoney(5750));

    const team = screen.getByRole('region', { name: 'Por profissional' });
    const cards = within(team).getAllByRole('listitem');
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      'Bruno Santos',
      'Ricardo Almeida',
    ]);
    expect(stat('Comissão (40%)', cards[0])).toBe(formatMoney(2800));

    const services = screen.getByRole('region', { name: 'Serviços mais pedidos' });
    expect(within(services).getByText('Corte + Barba')).toBeInTheDocument();
    expect(within(services).getAllByText('1 vez')).toHaveLength(2);

    const payments = screen.getByRole('region', { name: 'Formas de pagamento' });
    expect(within(payments).getByText('Dinheiro')).toBeInTheDocument();
    // Money has a non-breaking space, so compare the raw text.
    expect(
      within(payments)
        .getAllByText(/1 atendimento$/)
        .map((item) => item.textContent),
    ).toEqual([`${formatMoney(7000)} · 1 atendimento`, `${formatMoney(4500)} · 1 atendimento`]);

    const clients = screen.getByRole('region', { name: 'Retorno de clientes' });
    expect(stat('Clientes atendidos', clients)).toBe('2');
  });

  it('switches the period and keeps it in the URL', async () => {
    const { user } = await renderApp({ app, route: '/relatorios' });
    await screen.findByRole('heading', { name: 'Resumo do período' });

    await user.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(pressed('Hoje')).toBe('true');
    expect(screen.getByText('18/11')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Este mês' }));
    expect(screen.getByText('01/11 a 18/11')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Resumo do período' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Escolher datas' }));
    const form = screen.getByRole('form', { name: 'Escolher datas' });
    expect(within(form).getByLabelText('De')).toHaveValue('2026-11-01');
    expect(within(form).getByLabelText('Até')).toHaveValue('2026-11-18');

    await user.clear(within(form).getByLabelText('De'));
    await user.type(within(form).getByLabelText('De'), '2026-11-20');
    await user.click(within(form).getByRole('button', { name: 'Ver números' }));
    expect(
      within(form).getByText('A data de início precisa ser antes da data de fim.'),
    ).toBeInTheDocument();

    await user.clear(within(form).getByLabelText('Até'));
    await user.type(within(form).getByLabelText('Até'), '2026-11-27');
    await user.click(within(form).getByRole('button', { name: 'Ver números' }));
    expect(await screen.findByText('Sem atendimentos neste período')).toBeInTheDocument();
    expect(screen.getByText('20/11 a 27/11')).toBeInTheDocument();
  });

  it('reads a custom period from the URL and waits for valid dates', async () => {
    await renderApp({ app, route: '/relatorios?periodo=datas&de=2026-11-18&ate=2026-11-18' });
    expect(await screen.findByRole('heading', { name: 'Resumo do período' })).toBeVisible();
    expect(pressed('Escolher datas')).toBe('true');
  });

  it('shows nothing until a broken custom period in the URL is fixed', async () => {
    await renderApp({ app, route: '/relatorios?periodo=datas&de=amanha' });
    expect(await screen.findByRole('form', { name: 'Escolher datas' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resumo do período' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a professional only their own numbers', async () => {
    await renderApp({ app, as: 'barber', route: '/relatorios' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Meus números' })).toBeVisible();
    await screen.findByRole('heading', { name: 'Resumo do período' });
    expect(stat('Faturamento')).toBe(formatMoney(7000));
    expect(stat('Sua comissão (40%)')).toBe(formatMoney(2800));
    expect(screen.queryByRole('region', { name: 'Por profissional' })).not.toBeInTheDocument();
    expect(screen.queryByText('Corte')).not.toBeInTheDocument();
  });

  it('shows an error with a way to try again', async () => {
    const execute = vi
      .spyOn(app.useCases.reports.getReport, 'execute')
      .mockRejectedValueOnce(new Error('offline'));
    const { user } = await renderApp({ app, route: '/relatorios' });

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { name: 'Resumo do período' })).toBeVisible();
    execute.mockRestore();
  });
});
