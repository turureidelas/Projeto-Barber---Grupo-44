import { ComingSoon } from '../components/feedback/ComingSoon';
import { ptBR } from '../i18n/pt-BR';

/**
 * Screens delivered in later phases. Each one moves to its own folder (pages/<screen>/)
 * when it is built: settings (phase 8).
 */

export function SettingsPage() {
  return <ComingSoon title={ptBR.pages.settings} />;
}
