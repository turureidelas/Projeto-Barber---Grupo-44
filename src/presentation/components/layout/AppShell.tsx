import { Ellipsis } from 'lucide-react';
import { Suspense, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { navItemsFor, paths, type NavItem } from '../../app/routes';
import { useIsDemo } from '../../hooks/useDemo';
import { useCurrentUser } from '../../hooks/useSession';
import { ptBR } from '../../i18n/pt-BR';
import { ResetDemoButton } from '../demo/ResetDemoButton';
import { NotificationBell } from '../notifications/NotificationBell';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/states';
import { cx } from '../ui/cx';
import { Brand } from './Brand';
import { SignOutButton } from './SignOutButton';

const MAIN_ID = 'conteudo';

/**
 * Responsive frame: sidebar on wide screens, top bar + bottom navigation on phones
 * (thumb-reachable, 1 tap to the main screens).
 */
export function AppShell() {
  const user = useCurrentUser();
  const isDemo = useIsDemo();
  const items = navItemsFor(user);
  const bottomItems = items.filter((item) => item.inBottomBar);
  useFocusOnNavigation();

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only z-50 rounded-xl bg-accent px-4 py-3 font-semibold text-accent-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {ptBR.app.skipToContent}
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-line bg-surface p-4 lg:flex">
        <div className="flex items-center justify-between gap-2 px-2 pb-6">
          <Brand />
          <div className="flex items-center gap-1">
            {isDemo && <Badge tone="accent">Demo</Badge>}
            <NotificationBell className="-mr-2" />
          </div>
        </div>
        <nav aria-label={ptBR.nav.label} className="flex-1">
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.to}>
                <SidebarLink item={item} />
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <UserSummary name={user.name} role={ptBR.roles[user.role]} />
          <ResetDemoButton />
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Avatar name={user.name} size="sm" />
          </div>
        </header>

        <main
          id={MAIN_ID}
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-28 focus:outline-none sm:px-6 lg:px-8 lg:pt-8 lg:pb-10"
        >
          {/* Screens are loaded on demand (code splitting per route). */}
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Phone bottom navigation */}
      <nav
        aria-label={ptBR.nav.label}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {bottomItems.map((item) => (
            <li key={item.to} className="flex-1">
              <BottomLink to={item.to} label={item.label} icon={item.icon} />
            </li>
          ))}
          <li className="flex-1">
            <BottomLink to={paths.more} label={ptBR.nav.more} icon={Ellipsis} />
          </li>
        </ul>
      </nav>
    </div>
  );
}

/**
 * After moving to another screen (not on the first load), focus its title, so keyboard and
 * screen reader users start from the new content instead of the menu they clicked.
 */
function useFocusOnNavigation() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`#${MAIN_ID} h1`)?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [pathname]);
}

function SidebarLink({ item }: { readonly item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === paths.today}
      className={({ isActive }) =>
        cx(
          'flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold transition-colors',
          isActive ? 'bg-accent/15 text-accent' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        )
      }
    >
      <Icon aria-hidden="true" className="size-5" />
      {item.label}
    </NavLink>
  );
}

function BottomLink({ to, label, icon: Icon }: Pick<NavItem, 'to' | 'label' | 'icon'>) {
  return (
    <NavLink
      to={to}
      end={to === paths.today}
      className={({ isActive }) =>
        cx(
          'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold',
          isActive ? 'text-accent' : 'text-fg-muted',
        )
      }
    >
      <Icon aria-hidden="true" className="size-6" />
      {label}
    </NavLink>
  );
}

export function UserSummary({ name, role }: { readonly name: string; readonly role: string }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <Avatar name={name} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{name}</p>
        <p className="text-sm text-fg-muted">{role}</p>
      </div>
    </div>
  );
}
