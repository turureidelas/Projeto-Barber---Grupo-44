import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { navItemsFor } from '../../app/routes';
import { ResetDemoButton } from '../../components/demo/ResetDemoButton';
import { UserSummary } from '../../components/layout/AppShell';
import { SignOutButton } from '../../components/layout/SignOutButton';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { useCurrentUser } from '../../hooks/useSession';
import { ptBR } from '../../i18n/pt-BR';

/** "Mais" on phones: the screens that don't fit the bottom bar, plus account actions. */
export function MorePage() {
  const user = useCurrentUser();
  const extraItems = navItemsFor(user).filter((item) => !item.inBottomBar);

  return (
    <>
      <PageHeader title={ptBR.pages.more} />
      <div className="flex flex-col gap-4">
        {extraItems.length > 0 && (
          <nav aria-label={ptBR.pages.more}>
            <ul className="overflow-hidden rounded-card border border-line bg-surface">
              {extraItems.map(({ to, label, icon: Icon }) => (
                <li key={to} className="border-b border-line last:border-b-0">
                  <Link
                    to={to}
                    className="flex min-h-14 items-center gap-3 px-4 font-semibold hover:bg-surface-2"
                  >
                    <Icon aria-hidden="true" className="size-5 text-accent" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight aria-hidden="true" className="size-5 text-fg-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <Card className="flex flex-col gap-3">
          <UserSummary name={user.name} role={ptBR.roles[user.role]} />
          <ResetDemoButton variant="secondary" />
          <SignOutButton />
        </Card>
      </div>
    </>
  );
}
