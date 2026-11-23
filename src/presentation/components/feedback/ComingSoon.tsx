import { Hammer } from 'lucide-react';
import { ptBR } from '../../i18n/pt-BR';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState } from '../ui/states';

/** Placeholder for screens delivered in later phases. */
export function ComingSoon({
  title,
  subtitle,
}: {
  readonly title: string;
  readonly subtitle?: string;
}) {
  return (
    <>
      <PageHeader title={title} {...(subtitle && { subtitle })} />
      <EmptyState
        icon={Hammer}
        title={ptBR.common.comingSoon}
        description={ptBR.common.comingSoonBody}
      />
    </>
  );
}
