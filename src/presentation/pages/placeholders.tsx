import { toLocalDateString, formatLongDate } from '@shared/format';
import { ComingSoon } from '../components/feedback/ComingSoon';
import { useCurrentUser } from '../hooks/useSession';
import { ptBR } from '../i18n/pt-BR';

/**
 * Screens delivered in later phases. Each one moves to its own folder (pages/<screen>/)
 * when it is built: today (phase 4), week (5), cadastros (6), reports (7), settings (8).
 */

export function TodayPage() {
  const user = useCurrentUser();
  const firstName = user.name.split(' ')[0] ?? user.name;
  return (
    <ComingSoon
      title={ptBR.pages.hello(firstName)}
      subtitle={formatLongDate(toLocalDateString(new Date()))}
    />
  );
}

export function WeekPage() {
  return <ComingSoon title={ptBR.pages.week} />;
}

export function ClientsPage() {
  return <ComingSoon title={ptBR.pages.clients} />;
}

export function ServicesPage() {
  return <ComingSoon title={ptBR.pages.services} />;
}

export function ProfessionalsPage() {
  return <ComingSoon title={ptBR.pages.professionals} />;
}

export function ReportsPage() {
  const user = useCurrentUser();
  const own = !user.permissions.includes('reports:view-all');
  return <ComingSoon title={own ? ptBR.nav.myNumbers : ptBR.pages.reports} />;
}

export function SettingsPage() {
  return <ComingSoon title={ptBR.pages.settings} />;
}
