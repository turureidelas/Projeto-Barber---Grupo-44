import { at } from '@domain/testing/builders';
import { createTestApp, fixture, PASSWORD, type TestApp } from '@main/testing/createTestApp';
import { renderApp } from '@main/testing/renderApp';
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

/** Wednesday 18/11/2026 08:00. Default policy: 2h notice. João has a client account. */
let app: TestApp;

beforeEach(() => {
  app = createTestApp();
});

async function bookAsClient(time: string) {
  await app.signInAs('client');
  const booked = await app.useCases.client.book.execute({
    professionalId: fixture.bruno,
    serviceId: fixture.haircut,
    start: at(time).toISOString(),
  });
  return booked;
}

const heading = (name: string) => screen.findByRole('heading', { level: 1, name });

describe('client area access', () => {
  it('sends signed-out visitors to the client login, with a way to sign up', async () => {
    await renderApp({ app, route: '/cliente/agendar' });
    expect(await heading('Entrar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute(
      'href',
      '/cliente/criar-conta',
    );
    expect(screen.getByRole('link', { name: /Entrar no painel/ })).toHaveAttribute(
      'href',
      '/entrar',
    );
  });

  it('signs the client in and returns to the screen they tried to open', async () => {
    const { user } = await renderApp({ app, route: '/cliente/agendar' });
    await user.type(await screen.findByLabelText('E-mail'), fixture.users.client.email);
    await user.type(screen.getByLabelText('Senha'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await heading('Agendar horário')).toBeInTheDocument();
  });

  it('takes a client who signs in on the panel login to the client area', async () => {
    const { user } = await renderApp({ app, route: '/entrar' });
    expect(screen.getByRole('link', { name: /É cliente\?/ })).toHaveAttribute(
      'href',
      '/cliente/entrar',
    );
    await user.type(await screen.findByLabelText('E-mail'), fixture.users.client.email);
    await user.type(screen.getByLabelText('Senha'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await heading('Meus horários')).toBeInTheDocument();
  });

  it('keeps each kind of account in its own area', async () => {
    await renderApp({ app, as: 'client', route: '/clientes' });
    expect(await heading('Meus horários')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument();
  });

  it('sends staff who open the client area to the panel', async () => {
    await renderApp({ app, as: 'receptionist', route: '/cliente' });
    expect(await heading('Agenda de hoje')).toBeInTheDocument();
  });

  it('offers only the client demo account on the client login', async () => {
    const demo = createTestApp({ dataset: 'demo' });
    const { user } = await renderApp({ app: demo, route: '/cliente/entrar' });
    const account = await screen.findByRole('button', {
      name: 'Entrar como João Pedro Silva (Cliente)',
    });
    expect(screen.queryByRole('button', { name: /Ricardo Almeida/ })).not.toBeInTheDocument();
    await user.click(account);
    expect(await heading('Meus horários')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Seu próximo horário' })).toBeInTheDocument();
    expect(screen.queryByText('Você não tem horário marcado')).not.toBeInTheDocument();
  });
});

describe('creating an account', () => {
  async function fill(user: Awaited<ReturnType<typeof renderApp>>['user'], phone: string) {
    await user.type(await screen.findByLabelText('Seu nome'), 'Ana Clara');
    await user.type(screen.getByLabelText('Celular com DDD'), phone);
    await user.type(screen.getByLabelText('E-mail'), 'ana@email.demo');
    await user.type(screen.getByLabelText('Crie uma senha'), 'segredo1');
  }

  it('asks for consent, then creates the account and opens the client area', async () => {
    const { user } = await renderApp({ app, route: '/cliente/criar-conta' });
    expect(await heading('Criar conta')).toBeInTheDocument();
    expect(screen.getByText(/Agende seus horários na Barbearia Nova Era/)).toBeInTheDocument();
    await fill(user, '(11) 97777-1234');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText(/você precisa concordar/)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Concordo que a barbearia guarde/));
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await heading('Meus horários')).toBeInTheDocument();
    expect(await screen.findByText('Conta criada. Bem-vindo, Ana!')).toBeInTheDocument();
    expect(await screen.findByText('Você não tem horário marcado')).toBeInTheDocument();
  });

  it('explains when the phone is already registered at the barbershop', async () => {
    const { user } = await renderApp({ app, route: '/cliente/criar-conta' });
    await fill(user, '(11) 98765-4321');
    await user.click(screen.getByLabelText(/Concordo que a barbearia guarde/));
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esse celular já está cadastrado na barbearia.',
    );
  });
});

describe('booking', () => {
  it('books in four choices, offering only free times', async () => {
    await bookAsClient('10:00'); // takes Bruno's 10:00
    const { user } = await renderApp({ app, route: '/cliente/agendar' });
    expect(await heading('Agendar horário')).toBeInTheDocument();
    const confirm = await screen.findByRole('button', { name: 'Confirmar agendamento' });
    expect(confirm).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Corte' }));
    await user.click(screen.getByRole('radio', { name: 'Bruno Santos' }));
    expect(screen.getByRole('radio', { name: 'Hoje' })).toBeChecked();
    await screen.findByRole('radio', { name: '09:00' });
    expect(screen.queryByRole('radio', { name: '10:00' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '11:00' }));
    expect(screen.getByText('Corte com Bruno Santos, qua, 18/11 às 11:00.')).toBeInTheDocument();
    await user.click(confirm);

    expect(await heading('Meus horários')).toBeInTheDocument();
    expect(
      await screen.findByText('Pronto! Horário marcado para qua, 18/11 às 11:00.'),
    ).toBeInTheDocument();

    await app.useCases.auth.signOut.execute();
    await app.signInAs('barber');
    const notices = await app.useCases.notifications.list.execute();
    expect(notices.items.filter((item) => item.kind === 'APPOINTMENT_BOOKED')).toHaveLength(2);
  });
});

describe('my appointments', () => {
  it('cancels within the deadline after confirming', async () => {
    await bookAsClient('15:00');
    const { user } = await renderApp({ app, route: '/cliente' });
    expect(await screen.findByText('Dá para cancelar ou remarcar até qua, 18/11 às 13:00.'));

    await user.click(screen.getByRole('button', { name: 'Cancelar: Corte, qua, 18/11 às 15:00' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cancelar este horário?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar horário' }));

    expect(await screen.findByText('Horário cancelado.')).toBeInTheDocument();
    expect(await screen.findByText('Você não tem horário marcado')).toBeInTheDocument();
    const history = screen.getByRole('region', { name: 'Histórico' });
    expect(within(history).getByText('Cancelado')).toBeInTheDocument();
  });

  it('reschedules to another free time', async () => {
    await bookAsClient('15:00');
    const { user } = await renderApp({ app, route: '/cliente' });
    await user.click(
      await screen.findByRole('button', { name: 'Remarcar: Corte, qua, 18/11 às 15:00' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Remarcar horário' });
    await user.click(await within(dialog).findByRole('radio', { name: '16:00' }));
    await user.click(within(dialog).getByRole('button', { name: 'Remarcar' }));

    expect(
      await screen.findByText('Pronto! Remarcado para qua, 18/11 às 16:00.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('16:00')).toBeInTheDocument();
    });
  });

  it('points to the barbershop phone once it is too late to change', async () => {
    await bookAsClient('09:30');
    await renderApp({ app, route: '/cliente' });
    expect(await screen.findByText(/Passou do prazo para mudar pelo app/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Cancelar:/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ligar para a barbearia' })).toHaveAttribute(
      'href',
      'tel:1134567890',
    );
  });
});

describe('my account', () => {
  it('shows own data and consent, and signs out to the client login', async () => {
    await app.signInAs('client');
    const { user } = await renderApp({ app, route: '/cliente/conta' });
    expect(await heading('Minha conta')).toBeInTheDocument();
    expect(await screen.findByText('(11) 98765-4321')).toBeInTheDocument();
    expect(screen.getByText('Não há autorização registrada.')).toBeInTheDocument();
    expect(await screen.findByText(/até 2h antes do horário/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await heading('Entrar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar conta' })).toBeInTheDocument();
  });
});

describe('panel side', () => {
  it('shows a booking made by the client in the bell', async () => {
    await bookAsClient('15:00');
    await app.useCases.auth.signOut.execute();
    const { user } = await renderApp({ app, as: 'barber' });
    const [bell] = await screen.findAllByRole('button', { name: 'Avisos, 1 não lido' });
    if (!bell) throw new Error('bell not found');
    await user.click(bell);
    const dialog = await screen.findByRole('dialog', { name: 'Avisos' });
    expect(within(dialog).getByRole('heading', { name: /João Pedro agendou/ })).toBeInTheDocument();
    expect(
      within(dialog).getByText('Corte com Bruno, qua, 18/11 às 15:00. Marcado pelo app.'),
    ).toBeInTheDocument();
  });
});
