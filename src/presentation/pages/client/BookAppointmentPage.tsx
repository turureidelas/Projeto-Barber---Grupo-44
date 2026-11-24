import type { ProfessionalDTO, ServiceDTO } from '@application/dto/catalog';
import {
  addDaysToLocalDate,
  formatDateTime,
  formatMoney,
  formatShortDate,
  formatWeekdayShort,
} from '@shared/format';
import { CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { paths } from '../../app/routes';
import { SlotPicker } from '../../components/agenda/SlotPicker';
import { ChoiceGroup, type Choice } from '../../components/client-area/ChoiceGroup';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/states';
import { useProfessionals, useServices } from '../../hooks/useCatalog';
import { useClientBookingActions, useClientSlots } from '../../hooks/useClientArea';
import { useToday } from '../../hooks/useNow';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.clientArea.book;
/** How far ahead the client can pick a day. */
const DAYS_AHEAD = 14;

/** "Agendar": service → professional → day → free time → confirm. */
export function BookAppointmentPage() {
  const services = useServices();
  const professionals = useProfessionals();

  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      {services.isPending || professionals.isPending ? (
        <LoadingState />
      ) : services.isError || professionals.isError ? (
        <ErrorState
          message={errorMessage(services.error ?? professionals.error)}
          onRetry={() => {
            void services.refetch();
            void professionals.refetch();
          }}
        />
      ) : services.data.length === 0 ? (
        <p className="text-fg-muted">{t.noServices}</p>
      ) : professionals.data.length === 0 ? (
        <p className="text-fg-muted">{t.noProfessionals}</p>
      ) : (
        <BookingForm services={services.data} professionals={professionals.data} />
      )}
    </>
  );
}

interface BookingFormProps {
  readonly services: readonly ServiceDTO[];
  readonly professionals: readonly ProfessionalDTO[];
}

function BookingForm({ services, professionals }: BookingFormProps) {
  const today = useToday();
  const navigate = useNavigate();
  const { book } = useClientBookingActions();
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [start, setStart] = useState<string | null>(null);

  const service = services.find((item) => item.id === serviceId);
  const professional = professionals.find((item) => item.id === professionalId);
  const slots = useClientSlots(
    service && professional
      ? { professionalId: professional.id, serviceId: service.id, date }
      : null,
  );

  // Any earlier choice changes the free times, so the chosen time is cleared.
  const choose = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setStart(null);
  };

  const serviceChoices: Choice[] = services.map((item) => ({
    value: item.id,
    label: item.name,
    description: t.serviceDetails(item.durationMinutes, formatMoney(item.priceCents)),
  }));
  const professionalChoices: Choice[] = professionals.map((item) => ({
    value: item.id,
    label: item.name,
    ...(item.specialty && { description: item.specialty }),
  }));
  const dayChoices: Choice[] = Array.from({ length: DAYS_AHEAD }, (_, offset) => {
    const day = addDaysToLocalDate(today, offset);
    return {
      value: day,
      label: offset === 0 ? t.today : offset === 1 ? t.tomorrow : formatWeekdayShort(day),
      description: formatShortDate(day),
    };
  });

  const ready = service && professional && start;

  return (
    <div className="flex flex-col gap-8">
      <ChoiceGroup
        legend={t.service}
        choices={serviceChoices}
        selected={serviceId}
        onSelect={choose(setServiceId)}
      />
      {service && (
        <ChoiceGroup
          legend={t.professional}
          choices={professionalChoices}
          selected={professionalId}
          onSelect={choose(setProfessionalId)}
        />
      )}
      {service && professional && (
        <>
          <ChoiceGroup
            legend={t.date}
            choices={dayChoices}
            selected={date}
            onSelect={choose(setDate)}
            layout="grid"
          />
          <section aria-label={t.time}>
            <SlotPicker
              slots={slots.data}
              loading={slots.isPending}
              selected={start}
              onSelect={setStart}
              error={slots.isError ? errorMessage(slots.error) : undefined}
            />
          </section>
        </>
      )}

      <Card className="sticky bottom-20 flex flex-col gap-3 sm:bottom-4">
        <p className={ready ? 'font-semibold' : 'text-fg-muted'} aria-live="polite">
          {ready ? t.summary(service.name, professional.name, formatDateTime(start)) : t.chooseAll}
        </p>
        <Button
          size="lg"
          icon={CalendarCheck}
          fullWidth
          disabled={!ready}
          loading={book.isPending}
          onClick={() => {
            if (!ready) return;
            book.mutate(
              { professionalId: professional.id, serviceId: service.id, start },
              {
                onSuccess: () => {
                  void navigate(paths.client.home);
                },
              },
            );
          }}
        >
          {t.confirm}
        </Button>
      </Card>
    </div>
  );
}
