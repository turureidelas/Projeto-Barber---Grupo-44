import type { ServiceDTO } from '@application/dto/catalog';
import { formatMoney } from '@shared/format';
import { Layers, Pencil, Plus, Power, Scissors } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/states';
import { Table, Td, Th } from '../../components/ui/Table';
import { useCatalogMutations, useServices } from '../../hooks/useCatalog';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';
import { ServiceFormDialog, type ServiceFormMode } from './ServiceFormDialog';

const t = ptBR.services;
const c = ptBR.catalog;

/** "Serviços e combos" — what the barbershop offers, with duration and price. */
export function ServicesPage() {
  const services = useServices({ includeInactive: true });
  const mutations = useCatalogMutations();
  const [form, setForm] = useState<ServiceFormMode | null>(null);

  const all = services.data ?? [];
  const singles = all.filter((service) => service.kind === 'SINGLE' && service.active);
  const nameOf = (id: string) => all.find((service) => service.id === id)?.name ?? '';
  const close = () => {
    setForm(null);
  };
  const saving = mutations.createService.isPending || mutations.updateService.isPending;

  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <>
            <Button
              icon={Plus}
              onClick={() => {
                setForm({ kind: 'new-single' });
              }}
            >
              {t.newService}
            </Button>
            <Button
              variant="secondary"
              icon={Layers}
              onClick={() => {
                setForm({ kind: 'new-combo' });
              }}
            >
              {t.newCombo}
            </Button>
          </>
        }
      />

      {services.isPending ? (
        <LoadingState />
      ) : services.isError ? (
        <ErrorState
          message={errorMessage(services.error)}
          onRetry={() => void services.refetch()}
        />
      ) : all.length === 0 ? (
        <EmptyState icon={Scissors} title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <Table caption={t.tableCaption}>
          <thead>
            <tr>
              <Th>{t.name}</Th>
              <Th>{t.duration}</Th>
              <Th>{t.price}</Th>
              <Th>{t.status}</Th>
              <Th>
                <span className="sr-only">{c.actions}</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {all.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                comboNames={service.includedServiceIds.map(nameOf).join(' + ')}
                busy={mutations.setServiceActive.isPending}
                onEdit={() => {
                  setForm({ kind: 'edit', service });
                }}
                onToggle={() => {
                  mutations.setServiceActive.mutate({ id: service.id, active: !service.active });
                }}
              />
            ))}
          </tbody>
        </Table>
      )}

      <ServiceFormDialog
        mode={form}
        singles={singles}
        pending={saving}
        onClose={close}
        onSubmit={(input) => {
          if (form?.kind === 'edit') {
            mutations.updateService.mutate(
              { serviceId: form.service.id, ...input },
              { onSuccess: close },
            );
          } else {
            mutations.createService.mutate(input, { onSuccess: close });
          }
        }}
      />
    </>
  );
}

interface ServiceRowProps {
  readonly service: ServiceDTO;
  readonly comboNames: string;
  readonly busy: boolean;
  readonly onEdit: () => void;
  readonly onToggle: () => void;
}

function ServiceRow({ service, comboNames, busy, onEdit, onToggle }: ServiceRowProps) {
  return (
    <tr className={service.active ? undefined : 'text-fg-muted'}>
      <Td>
        <p className="font-semibold">{service.name}</p>
        {service.kind === 'COMBO' && (
          <p className="text-sm text-fg-muted">{t.comboOf(comboNames)}</p>
        )}
      </Td>
      <Td className="whitespace-nowrap">{t.minutes(service.durationMinutes)}</Td>
      <Td className="whitespace-nowrap tabular-nums">{formatMoney(service.priceCents)}</Td>
      <Td>
        <Badge tone={service.active ? 'success' : 'neutral'}>
          {service.active ? c.active : c.inactive}
        </Badge>
      </Td>
      <Td>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            icon={Pencil}
            aria-label={c.editItem(service.name)}
            onClick={onEdit}
          >
            {c.edit}
          </Button>
          <Button
            variant="ghost"
            icon={Power}
            disabled={busy}
            aria-label={
              service.active ? c.deactivateItem(service.name) : c.activateItem(service.name)
            }
            onClick={onToggle}
          >
            {service.active ? c.deactivate : c.activate}
          </Button>
        </div>
      </Td>
    </tr>
  );
}
