import { ShieldX } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '../../app/routes';
import { buttonClasses } from '../../components/ui/button-styles';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/states';
import { ptBR } from '../../i18n/pt-BR';

export function ForbiddenPage() {
  return (
    <>
      <PageHeader title={ptBR.pages.forbidden} />
      <EmptyState
        icon={ShieldX}
        title={ptBR.pages.forbidden}
        description={ptBR.pages.forbiddenBody}
        action={
          <Link to={paths.today} className={buttonClasses({ variant: 'secondary' })}>
            {ptBR.pages.goHome}
          </Link>
        }
      />
    </>
  );
}
