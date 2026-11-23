import { createTestApp, PASSWORD } from '@main/testing/createTestApp';
import { renderApp } from '@main/testing/renderApp';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/** Visible names of the links in the first navigation (sidebar). */
function menuLinks(): string[] {
  const [menu] = screen.getAllByRole('navigation', { name: 'Menu principal' });
  if (!menu) throw new Error('menu not found');
  return within(menu)
    .getAllByRole('link')
    .map((link) => link.textContent);
}

describe('sign in', () => {
  it('sends visitors to the login screen', async () => {
    await renderApp({ route: '/' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument();
  });

  it('validates the form before calling the server', async () => {
    const { user } = await renderApp({ route: '/entrar' });
    await user.click(await screen.findByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Digite seu e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Digite sua senha.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a friendly message for wrong credentials', async () => {
    const { user } = await renderApp({ route: '/entrar' });
    await user.type(await screen.findByLabelText('E-mail'), 'ricardo@novaera.demo');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
  });

  it('signs in and returns to the page the user tried to open', async () => {
    const { user } = await renderApp({ route: '/clientes' });
    await user.type(await screen.findByLabelText('E-mail'), 'ricardo@novaera.demo');
    await user.type(screen.getByLabelText('Senha'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Clientes' })).toBeInTheDocument();
  });

  it('offers one-tap demo accounts', async () => {
    const app = createTestApp({ dataset: 'demo' });
    const { user } = await renderApp({ route: '/entrar', app });
    await user.click(
      await screen.findByRole('button', { name: 'Entrar como Ricardo Almeida (Gestor)' }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Agenda de hoje' }),
    ).toBeInTheDocument();
  });
});

describe('navigation by profile', () => {
  it('shows every area to the owner', async () => {
    await renderApp({ as: 'owner' });
    await screen.findByRole('heading', { level: 1, name: 'Agenda de hoje' });
    expect(menuLinks()).toEqual([
      'Hoje',
      'Semana',
      'Clientes',
      'Relatórios',
      'Serviços',
      'Equipe',
      'Configurações',
    ]);
  });

  it('gives the receptionist the agenda and clients, but no reports or settings', async () => {
    await renderApp({ as: 'receptionist', route: '/relatorios' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sem acesso' }),
    ).toBeInTheDocument();
    expect(menuLinks()).toEqual(['Hoje', 'Semana', 'Clientes']);
  });

  it('shows "Meus números" to a barber and hides clients and settings', async () => {
    await renderApp({ as: 'barber', route: '/relatorios' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Meus números' }),
    ).toBeInTheDocument();
    expect(menuLinks()).toEqual(['Hoje', 'Semana', 'Meus números']);
  });

  it('lists the extra areas under "Mais" on phones', async () => {
    await renderApp({ as: 'owner', route: '/mais' });
    const more = await screen.findByRole('navigation', { name: 'Mais opções' });
    expect(
      within(more)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Serviços', 'Equipe', 'Configurações']);
  });

  it('marks the current page in the menu', async () => {
    await renderApp({ as: 'owner', route: '/semana' });
    await screen.findByRole('heading', { level: 1, name: 'Agenda da semana' });
    const [menu] = screen.getAllByRole('navigation', { name: 'Menu principal' });
    if (!menu) throw new Error('menu not found');
    expect(within(menu).getByRole('link', { name: 'Semana' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(menu).getByRole('link', { name: 'Hoje' })).not.toHaveAttribute('aria-current');
  });

  it('has a skip link to the main content', async () => {
    await renderApp({ as: 'owner' });
    expect(await screen.findByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute(
      'href',
      '#conteudo',
    );
  });

  it('explains unknown addresses', async () => {
    await renderApp({ as: 'owner', route: '/nao-existe' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' }),
    ).toBeInTheDocument();
  });
});

describe('account actions', () => {
  it('signs out back to the login screen', async () => {
    const { user } = await renderApp({ as: 'owner', route: '/mais' });
    const [signOut] = await screen.findAllByRole('button', { name: 'Sair' });
    if (!signOut) throw new Error('sign out not found');
    await user.click(signOut);
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument();
  });

  it('resets the demo data after confirmation', async () => {
    const app = createTestApp({ dataset: 'demo' });
    await app.useCases.auth.signIn.execute({ email: 'ricardo@novaera.demo', password: 'demo123' });
    const { user } = await renderApp({ app, route: '/mais' });

    const [reset] = await screen.findAllByRole('button', { name: 'Resetar dados de demonstração' });
    if (!reset) throw new Error('reset not found');
    await user.click(reset);
    const dialog = await screen.findByRole('dialog', { name: 'Resetar os dados de demonstração?' });
    await user.click(within(dialog).getByRole('button', { name: 'Resetar dados de demonstração' }));

    expect(await screen.findByText('Dados de demonstração restaurados.')).toBeInTheDocument();
  });
});
