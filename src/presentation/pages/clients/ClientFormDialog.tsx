import type { ClientDetailsDTO } from '@application/dto/catalog';
import type { ClientInput } from '@application/use-cases';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { ClientFields } from '../../components/clients/client-form';
import {
  clientSchema,
  toClientInput,
  type ClientFormValues,
} from '../../components/clients/client-form-schema';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.clients;

interface ClientFormDialogProps {
  readonly open: boolean;
  /** null = new client (asks for consent). */
  readonly client: ClientDetailsDTO | null;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (input: ClientInput & { consentGiven: boolean }) => void;
}

export function ClientFormDialog({
  open,
  client,
  pending,
  onClose,
  onSubmit,
}: ClientFormDialogProps) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? t.formEdit : t.formNew}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {ptBR.common.cancel}
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {ptBR.catalog.save}
          </Button>
        </>
      }
    >
      {open && <ClientForm formId={formId} client={client} onSubmit={onSubmit} />}
    </Modal>
  );
}

interface ClientFormProps {
  readonly formId: string;
  readonly client: ClientDetailsDTO | null;
  readonly onSubmit: (input: ClientInput & { consentGiven: boolean }) => void;
}

function ClientForm({ formId, client, onSubmit }: ClientFormProps) {
  const isNew = client === null;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema(isNew)),
    defaultValues: {
      name: client?.name ?? '',
      phone: client?.phone ?? '',
      email: client?.email ?? '',
      consent: false,
    },
  });

  const submit = handleSubmit((values) => {
    onSubmit({ ...toClientInput(values), consentGiven: values.consent });
  });

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
    >
      <ClientFields register={register} errors={errors} withConsent={isNew} />
    </form>
  );
}
