import { ComingSoon } from '../components/feedback/ComingSoon';
import { useCurrentUser } from '../hooks/useSession';
import { ptBR } from '../i18n/pt-BR';

/**
 * Screens delivered in later phases. Each one moves to its own folder (pages/<screen>/)
 * when it is built: reports (phase 7), settings (8).
 */

export function ReportsPage() {
  const user = useCurrentUser();
  const own = !user.permissions.includes('reports:view-all');
  return <ComingSoon title={own ? ptBR.nav.myNumbers : ptBR.pages.reports} />;
}

export function SettingsPage() {
  return <ComingSoon title={ptBR.pages.settings} />;
}
