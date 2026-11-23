import { UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { paths } from '../../app/routes';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/fields';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/states';
import { Table, Td, Th } from '../../components/ui/Table';
import { useCatalogMutations, useClientSearch } from '../../hooks/useCatalog';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';
import { ClientFormDialog } from './ClientFormDialog';

const t = ptBR.clients;
const LIST_LIMIT = 50;

/** Client list with search. Contacts are masked here (LGPD); the full record opens on click. */
export function ClientsPage() {
  const [query, setQuery] = useState('');
  const clients = useClientSearch(query, { limit: LIST_LIMIT });
  const mutations = useCatalogMutations();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <Button
            icon={UserPlus}
            onClick={() => {
              setCreating(true);
            }}
          >
            {t.newClient}
          </Button>
        }
      />

      <div className="mb-4 max-w-md">
        <TextField
          label={t.search}
          hint={t.searchHint}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </div>

      {clients.isPending ? (
        <LoadingState />
      ) : clients.isError ? (
        <ErrorState message={errorMessage(clients.error)} onRetry={() => void clients.refetch()} />
      ) : clients.data.length === 0 ? (
        <EmptyState icon={Users} title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <Table caption={t.tableCaption}>
          <thead>
            <tr>
              <Th>{t.name}</Th>
              <Th>{t.phone}</Th>
              <Th className="hidden sm:table-cell">{t.email}</Th>
            </tr>
          </thead>
          <tbody>
            {clients.data.map((client) => (
              <tr key={client.id} className="hover:bg-surface-2">
                <Td>
                  <Link
                    to={paths.clientDetails(client.id)}
                    className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline"
                  >
                    {client.name}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap tabular-nums">{client.phoneMasked}</Td>
                <Td className="hidden text-fg-muted sm:table-cell">{client.emailMasked ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <ClientFormDialog
        open={creating}
        client={null}
        pending={mutations.createClient.isPending}
        onClose={() => {
          setCreating(false);
        }}
        onSubmit={(input) => {
          mutations.createClient.mutate(input, {
            onSuccess: () => {
              setCreating(false);
            },
          });
        }}
      />
    </>
  );
}
