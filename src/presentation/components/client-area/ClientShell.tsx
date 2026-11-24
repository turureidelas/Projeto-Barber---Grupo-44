import { CalendarCheck, CalendarPlus, CircleUser, type LucideIcon } from 'lucide-react';
import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { paths } from '../../app/routes';
import { useIsDemo } from '../../hooks/useDemo';
import { useCurrentUser } from '../../hooks/useSession';
import { ptBR } from '../../i18n/pt-BR';
import { Brand } from '../layout/Brand';
import { MAIN_ID, useFocusOnNavigation } from '../layout/useFocusOnNavigation';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/states';
import { cx } from '../ui/cx';

const t = ptBR.clientArea.nav;

interface ClientNavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

const NAV_ITEMS: readonly ClientNavItem[] = [
  { to: paths.client.home, label: t.home, icon: CalendarCheck },
  { to: paths.client.book, label: t.book, icon: CalendarPlus },
  { to: paths.client.account, label: t.account, icon: CircleUser },
];

/**
 * Client area frame, phone first: top bar + bottom navigation (3 big targets). On wider
 * screens the same links move to the top bar and the content stays in a narrow column.
 */
export function ClientShell() {
  const user = useCurrentUser();
  const isDemo = useIsDemo();
  useFocusOnNavigation();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only z-50 rounded-xl bg-accent px-4 py-3 font-semibold text-accent-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {ptBR.app.skipToContent}
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-2">
            <Brand />
            {isDemo && <Badge tone="accent">Demo</Badge>}
          </div>
          <nav aria-label={t.label} className="hidden sm:block">
            <ul className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <TopLink item={item} />
                </li>
              ))}
            </ul>
          </nav>
          <Avatar name={user.name} size="sm" />
        </div>
      </header>

      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28 focus:outline-none sm:pb-10 lg:pt-8"
      >
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>

      <nav
        aria-label={t.label}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <BottomLink item={item} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function TopLink({ item }: { readonly item: ClientNavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) =>
        cx(
          'flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold transition-colors',
          isActive ? 'bg-accent/15 text-accent' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        )
      }
    >
      <Icon aria-hidden="true" className="size-5" />
      {item.label}
    </NavLink>
  );
}

function BottomLink({ item }: { readonly item: ClientNavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) =>
        cx(
          'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold',
          isActive ? 'text-accent' : 'text-fg-muted',
        )
      }
    >
      <Icon aria-hidden="true" className="size-6" />
      {item.label}
    </NavLink>
  );
}
