import type { ClientSummaryDTO, ProfessionalDTO } from '@application/dto/catalog';
import type { ScheduleAppointmentInput } from '@application/use-cases';
import { formatMoney } from '@shared/format';
import { Search, UserPlus, UserRound } from 'lucide-react';
import { useId, useState } from 'react';
import { useAvailableSlots } from '../../hooks/useAgenda';
import { useCatalogMutations, useClientSearch, useServices } from '../../hooks/useCatalog';
import { useCurrentUser } from '../../hooks/useSession';
import { QuickClientForm } from '../clients/client-form';
import { toClientInput } from '../clients/client-form-schema';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/fields';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { SlotPicker } from './SlotPicker';

const t = ptBR.newAppointment;

interface NewAppointmentDialogProps {
  readonly open: boolean;
  readonly today: string;
  readonly defaultDate: string;
  readonly defaultProfessionalId: string;
  /** Professionals the user may book for (one entry = no choice shown). */
  readonly professionals: readonly ProfessionalDTO[];
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (input: ScheduleAppointmentInput) => void;
}

/** Booking from the panel (phone call, walk-in): client → service → professional → day → time. */
export function NewAppointmentDialog({
  open,
  pending,
  onClose,
  onConfirm,
  ...formProps
}: NewAppointmentDialogProps) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {ptBR.common.cancel}
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {t.submit}
          </Button>
        </>
      }
    >
      {open && <NewAppointmentForm formId={formId} onConfirm={onConfirm} {...formProps} />}
    </Modal>
  );
}

interface NewAppointmentFormProps {
  readonly formId: string;
  readonly today: string;
  readonly defaultDate: string;
  readonly defaultProfessionalId: string;
  readonly professionals: readonly ProfessionalDTO[];
  readonly onConfirm: (input: ScheduleAppointmentInput) => void;
}

function NewAppointmentForm({
  formId,
  today,
  defaultDate,
  defaultProfessionalId,
  professionals,
  onConfirm,
}: NewAppointmentFormProps) {
  const services = useServices();
  const [client, setClient] = useState<ClientSummaryDTO | null>(null);
  const [serviceId, setServiceId] = useState<string>('');
  const [professionalId, setProfessionalId] = useState(defaultProfessionalId);
  const [date, setDate] = useState(defaultDate < today ? today : defaultDate);
  const [slot, setSlot] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ client?: string; slot?: string }>({});

  const chosenService = serviceId !== '' ? serviceId : (services.data?.[0]?.id ?? '');
  const slots = useAvailableSlots(
    chosenService ? { professionalId, serviceId: chosenService, date } : null,
  );

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const nextErrors = {
          ...(!client && { client: t.chooseClient }),
          ...(!slot && { slot: ptBR.slots.choose }),
        };
        setErrors(nextErrors);
        if (!client || !slot) return;
        onConfirm({ clientId: client.id, serviceId: chosenService, professionalId, start: slot });
      }}
      className="flex flex-col gap-4"
    >
      {client ? (
        <div className="flex items-center gap-3 rounded-xl border border-line-strong bg-surface-2 p-3">
          <UserRound aria-hidden="true" className="size-5 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{client.name}</p>
            <p className="text-sm text-fg-muted">{client.phoneMasked}</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setClient(null);
            }}
          >
            {t.changeClient}
          </Button>
        </div>
      ) : (
        <ClientPicker
          error={errors.client}
          onPick={(picked) => {
            setClient(picked);
            setErrors((current) => ({ ...current, client: undefined }));
          }}
        />
      )}

      <SelectField
        label={t.service}
        value={chosenService}
        options={(services.data ?? []).map((service) => ({
          value: service.id,
          label: t.serviceOption(
            service.name,
            service.durationMinutes,
            formatMoney(service.priceCents),
          ),
        }))}
        onChange={(event) => {
          setServiceId(event.target.value);
          setSlot(null);
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {professionals.length > 1 && (
          <SelectField
            label={t.professional}
            value={professionalId}
            options={professionals.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(event) => {
              setProfessionalId(event.target.value);
              setSlot(null);
            }}
          />
        )}
        <TextField
          label={t.date}
          type="date"
          min={today}
          value={date}
          onChange={(event) => {
            if (event.target.value) setDate(event.target.value);
            setSlot(null);
          }}
        />
      </div>

      <SlotPicker
        slots={slots.data}
        loading={chosenService !== '' && slots.isPending}
        selected={slot}
        error={errors.slot}
        onSelect={(start) => {
          setSlot(start);
          setErrors((current) => ({ ...current, slot: undefined }));
        }}
      />
    </form>
  );
}

interface ClientPickerProps {
  readonly error: string | undefined;
  readonly onPick: (client: ClientSummaryDTO) => void;
}

function ClientPicker({ error, onPick }: ClientPickerProps) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const results = useClientSearch(query);
  const listId = useId();
  const user = useCurrentUser();
  const { createClient } = useCatalogMutations();
  const canCreate = user.permissions.includes('clients:manage');

  if (creating) {
    return (
      <QuickClientForm
        pending={createClient.isPending}
        onCancel={() => {
          setCreating(false);
        }}
        onSubmit={(values) => {
          createClient.mutate(
            { ...toClientInput(values), consentGiven: values.consent },
            { onSuccess: onPick },
          );
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <TextField
        label={t.clientSearch}
        hint={t.clientSearchHint}
        type="search"
        autoComplete="off"
        value={query}
        error={error}
        aria-controls={listId}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      <div id={listId} aria-live="polite">
        {results.isPending ? (
          <p className="flex items-center gap-2 text-fg-muted">
            <Spinner /> {t.searching}
          </p>
        ) : (results.data ?? []).length === 0 ? (
          <p className="text-fg-muted">{t.noClients}</p>
        ) : (
          <ul aria-label={t.client} className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {(results.data ?? []).map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(client);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-surface-2"
                >
                  <Search aria-hidden="true" className="size-4 text-fg-muted" />
                  <span className="flex-1 font-semibold">{client.name}</span>
                  <span className="text-sm text-fg-muted">{client.phoneMasked}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {canCreate && (
        <Button
          variant="ghost"
          icon={UserPlus}
          className="self-start"
          onClick={() => {
            setCreating(true);
          }}
        >
          {ptBR.clients.quickCreate}
        </Button>
      )}
    </div>
  );
}
