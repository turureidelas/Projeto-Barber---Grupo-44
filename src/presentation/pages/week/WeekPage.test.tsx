import { at } from '@domain/testing/builders';
import { createTestApp, fixture, type TestApp } from '@main/testing/createTestApp';
import { renderApp } from '@main/testing/renderApp';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/** Week of 2026-11-16 (Mon) to 22 (Sun); today is Wednesday 18, 08:00. */

async function book(app: TestApp, time: string, professionalId: string = fixture.ricardo) {
  await app.signInAs('owner');
  await app.useCases.agenda.scheduleAppointment.execute({
    professionalId,
    clientId: professionalId === fixture.ricardo ? fixture.joao : fixture.maria,
    serviceId: fixture.haircut,
    start: at(time).toISOString(),
  });
}

async function withJoaoAtTen(now = at('08:00')) {
  const app = createTestApp();
  await book(app, '10:00');
  app.clock.set(now);
  return app;
}

const wednesday = () => screen.getByRole('region', { name: /^quarta-feira, 18 de novembro/ });

async function openJoao(user: Awaited<ReturnType<typeof renderApp>>['user']) {
  await user.click(
    await within(
      await screen.findByRole('region', { name: /^quarta-feira, 18 de novembro/ }),
    ).findByRole('button', { name: /10:00.*João Pedro/ }),
  );
  return screen.findByRole('dialog', { name: 'João Pedro' });
}

describe('WeekPage', () => {
  it("shows the professional's week with working hours and days off", async () => {
    const app = await withJoaoAtTen();
    await renderApp({ app, as: 'owner', route: '/semana' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Agenda da semana' }),
    ).toBeInTheDocument();
    expect(screen.getByText('16/11 a 22/11')).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: 'domingo, 22 de novembro' }),
    ).toHaveTextContent('Folga');
    expect(wednesday()).toHaveTextContent('09:00–12:00 · 13:00–19:00');
    expect(
      within(wednesday()).getByRole('button', { name: /10:00.*João Pedro.*Corte/ }),
    ).toBeInTheDocument();

    const days = screen.getByRole('group', { name: 'Dias da semana' });
    expect(within(days).getAllByRole('button')).toHaveLength(7);
    expect(within(days).getByRole('button', { name: /^qua 18\/11/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('switches between professionals', async () => {
    const app = await withJoaoAtTen();
    await book(app, '11:00', fixture.bruno);
    const { user } = await renderApp({ app, as: 'owner', route: '/semana' });

    const chips = await screen.findByRole('group', { name: 'Agenda de' });
    await user.click(within(chips).getByRole('button', { name: 'Bruno' }));
    expect(
      await within(wednesday()).findByRole('button', { name: /11:00.*Maria Antônia/ }),
    ).toBeInTheDocument();
    expect(
      within(wednesday()).queryByRole('button', { name: /João Pedro/ }),
    ).not.toBeInTheDocument();
  });

  it('confirms an appointment from its details', async () => {
    const app = await withJoaoAtTen();
    const { user } = await renderApp({ app, as: 'owner', route: '/semana' });

    const dialog = await openJoao(user);
    expect(dialog).toHaveTextContent('qua, 18/11 às 10:00–10:30');
    await user.click(within(dialog).getByRole('button', { name: 'Cliente confirmou' }));

    expect(await screen.findByText('Horário de João Pedro confirmado.')).toBeInTheDocument();
    expect(
      await within(wednesday()).findByRole('button', { name: /Confirmado.*João Pedro/ }),
    ).toBeInTheDocument();
  });

  it('reschedules by picking one of the free times', async () => {
    const app = await withJoaoAtTen();
    const { user } = await renderApp({ app, as: 'owner', route: '/semana' });

    await user.click(within(await openJoao(user)).getByRole('button', { name: 'Remarcar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remarcar' });
    expect(within(dialog).getByLabelText('Novo dia')).toHaveValue('2026-11-18');

    await user.click(within(dialog).getByRole('button', { name: 'Remarcar' }));
    expect(await within(dialog).findByText('Escolha um horário.')).toBeInTheDocument();

    await user.click(await within(dialog).findByRole('radio', { name: '15:00' }));
    await user.click(within(dialog).getByRole('button', { name: 'Remarcar' }));

    expect(
      await screen.findByText('João Pedro remarcado para qua, 18/11 às 15:00.'),
    ).toBeInTheDocument();
    expect(
      await within(wednesday()).findByRole('button', { name: /15:00.*João Pedro/ }),
    ).toBeInTheDocument();
  });

  it('asks for a reason when cancelling at the last minute', async () => {
    const app = await withJoaoAtTen(at('09:00'));
    const { user } = await renderApp({ app, as: 'owner', route: '/semana' });

    await user.click(
      within(await openJoao(user)).getByRole('button', { name: 'Cancelar agendamento' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Cancelar agendamento' });
    expect(dialog).toHaveTextContent('Está em cima da hora: o prazo para cancelar era até 08:00.');

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar agendamento' }));
    expect(
      await within(dialog).findByText('Escreva o motivo do cancelamento.'),
    ).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Motivo'), 'Cliente avisou que está doente');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar agendamento' }));
    expect(
      await screen.findByText('Agendamento de João Pedro cancelado. O horário ficou livre.'),
    ).toBeInTheDocument();
    expect(
      await within(wednesday()).findByRole('button', { name: /Cancelado.*João Pedro/ }),
    ).toBeInTheDocument();
  });

  it('blocks a time range and frees it again', async () => {
    const { user } = await renderApp({ as: 'owner', route: '/semana' });

    await user.click(await screen.findByRole('button', { name: 'Bloquear horário' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bloquear horário' });
    expect(dialog).toHaveAccessibleDescription(
      'Ninguém poderá agendar com Ricardo Almeida nesse período.',
    );
    expect(within(dialog).getByLabelText('Dia')).toHaveValue('2026-11-18');
    await user.selectOptions(within(dialog).getByLabelText('Das'), '15:00');
    await user.selectOptions(within(dialog).getByLabelText('Até'), '14:00');
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear horário' }));
    expect(
      await within(dialog).findByText('O fim precisa ser depois do início.'),
    ).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText('Até'), '16:00');
    await user.type(within(dialog).getByLabelText('Motivo (opcional)'), 'Curso');
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear horário' }));

    expect(await screen.findByText('Horário bloqueado.')).toBeInTheDocument();
    const blocked = await within(wednesday()).findByRole('button', {
      name: /Bloqueado 15:00–16:00.*Curso/,
    });
    await user.click(blocked);
    const confirm = await screen.findByRole('dialog', { name: 'Liberar este horário?' });
    await user.click(within(confirm).getByRole('button', { name: 'Liberar horário' }));

    expect(await screen.findByText('Horário liberado.')).toBeInTheDocument();
    expect(
      within(wednesday()).queryByRole('button', { name: /Bloqueado/ }),
    ).not.toBeInTheDocument();
  });

  it('lets the receptionist book a client into a free time', async () => {
    const { user } = await renderApp({ as: 'receptionist', route: '/semana' });

    await user.click(await screen.findByRole('button', { name: 'Novo agendamento' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo agendamento' });
    await user.click(within(dialog).getByRole('button', { name: 'Agendar' }));
    expect(await within(dialog).findByText('Escolha o cliente.')).toBeInTheDocument();
    expect(within(dialog).getByText('Escolha um horário.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Buscar cliente'), 'maria');
    await user.click(await within(dialog).findByRole('button', { name: /Maria Antônia/ }));
    expect(within(dialog).getByText('Maria Antônia')).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText('Serviço'), fixture.haircut);
    expect(within(dialog).getByLabelText('Profissional')).toHaveDisplayValue('Bruno Santos');
    await user.click(await within(dialog).findByRole('radio', { name: '10:00' }));
    await user.click(within(dialog).getByRole('button', { name: 'Agendar' }));

    expect(
      await screen.findByText('Maria Antônia agendado para qua, 18/11 às 10:00.'),
    ).toBeInTheDocument();
    expect(
      await within(wednesday()).findByRole('button', { name: /10:00.*Maria Antônia/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bloquear horário' })).not.toBeInTheDocument();
  });

  it('shows a barber only their own week, and lets them block their time', async () => {
    const app = await withJoaoAtTen();
    await renderApp({ app, as: 'barber', route: '/semana' });

    expect(
      await screen.findByRole('region', { name: /^quarta-feira, 18 de novembro/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Agenda de' })).not.toBeInTheDocument();
    expect(
      within(wednesday()).queryByRole('button', { name: /João Pedro/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bloquear horário' })).toBeInTheDocument();
  });

  it('moves between weeks', async () => {
    const { user } = await renderApp({ as: 'owner', route: '/semana' });

    await user.click(await screen.findByRole('button', { name: 'Próxima semana' }));
    expect(await screen.findByText('23/11 a 29/11')).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: 'segunda-feira, 23 de novembro' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Esta semana' }));
    expect(await screen.findByText('16/11 a 22/11')).toBeInTheDocument();
  });
});
