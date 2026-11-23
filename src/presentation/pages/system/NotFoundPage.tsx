import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '../../app/routes';
import { buttonClasses } from '../../components/ui/button-styles';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/states';
import { ptBR } from '../../i18n/pt-BR';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title={ptBR.pages.notFound} />
      <EmptyState
        icon={Compass}
        title={ptBR.pages.notFound}
        description={ptBR.pages.notFoundBody}
        action={
          <Link to={paths.today} className={buttonClasses({ variant: 'secondary' })}>
            {ptBR.pages.goHome}
          </Link>
        }
      />
    </>
  );
}
