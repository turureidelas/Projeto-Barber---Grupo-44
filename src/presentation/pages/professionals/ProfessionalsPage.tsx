import type { ProfessionalDetailsDTO, ProfessionalDTO } from '@application/dto/catalog';
import { CalendarCog, Pencil, Plus, Power, UserCog } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/states';
import {
  useCatalogMutations,
  useProfessional,
  useProfessionals,
  type CatalogMutations,
} from '../../hooks/useCatalog';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';
import { ProfessionalFormDialog } from './ProfessionalFormDialog';
import { ScheduleDialog } from './ScheduleDialog';

const t = ptBR.team;
const c = ptBR.catalog;

type Dialog =
  | { readonly kind: 'none' }
  | { readonly kind: 'new' }
  | { readonly kind: 'edit' | 'schedule'; readonly professional: ProfessionalDetailsDTO };

/** "Equipe e escalas" — who works, their commission and their weekly hours. */
export function ProfessionalsPage() {
  const team = useProfessionals({ includeInactive: true });
  const mutations = useCatalogMutations();
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const close = () => {
    setDialog({ kind: 'none' });
  };

  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setDialog({ kind: 'new' });
            }}
          >
            {t.newProfessional}
          </Button>
        }
      />

      {team.isPending ? (
        <LoadingState />
      ) : team.isError ? (
        <ErrorState message={errorMessage(team.error)} onRetry={() => void team.refetch()} />
      ) : team.data.length === 0 ? (
        <EmptyState icon={UserCog} title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {team.data.map((professional) => (
            <li key={professional.id}>
              <ProfessionalCard
                professional={professional}
                mutations={mutations}
                onEdit={(details) => {
                  setDialog({ kind: 'edit', professional: details });
                }}
                onSchedule={(details) => {
                  setDialog({ kind: 'schedule', professional: details });
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <ProfessionalFormDialog
        open={dialog.kind === 'new' || dialog.kind === 'edit'}
        professional={dialog.kind === 'edit' ? dialog.professional : null}
        pending={mutations.createProfessional.isPending || mutations.updateProfessional.isPending}
        onClose={close}
        onSubmit={(input) => {
          if (dialog.kind === 'edit') {
            mutations.updateProfessional.mutate(
              { professionalId: dialog.professional.id, ...input },
              { onSuccess: close },
            );
          } else {
            // A new professional has no hours yet: open the schedule right away.
            mutations.createProfessional.mutate(input, {
              onSuccess: (created) => {
                setDialog({ kind: 'schedule', professional: created });
              },
            });
          }
        }}
      />
      <ScheduleDialog
        professional={dialog.kind === 'schedule' ? dialog.professional : null}
        pending={mutations.updateWorkSchedule.isPending}
        onClose={close}
        onSubmit={(schedule) => {
          if (dialog.kind !== 'schedule') return;
          mutations.updateWorkSchedule.mutate(
            { professionalId: dialog.professional.id, schedule },
            { onSuccess: close },
          );
        }}
      />
    </>
  );
}

interface ProfessionalCardProps {
  readonly professional: ProfessionalDTO;
  readonly mutations: CatalogMutations;
  readonly onEdit: (details: ProfessionalDetailsDTO) => void;
  readonly onSchedule: (details: ProfessionalDetailsDTO) => void;
}

function ProfessionalCard({ professional, mutations, onEdit, onSchedule }: ProfessionalCardProps) {
  const details = useProfessional(professional.id);
  const data = details.data;

  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={professional.name} photoUrl={professional.photoUrl} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{professional.name}</h2>
          {professional.specialty && <p className="text-fg-muted">{professional.specialty}</p>}
          {professional.commissionPercent !== null && (
            <p className="text-sm">{t.commission(professional.commissionPercent)}</p>
          )}
        </div>
        <Badge tone={professional.active ? 'success' : 'neutral'}>
          {professional.active ? c.active : c.inactive}
        </Badge>
      </div>

      {data ? (
        data.schedule.length === 0 ? (
          <p className="text-sm text-warning">{t.noSchedule}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 text-sm sm:grid-cols-3">
            {data.schedule.map((day) => (
              <li key={day.weekday} className="tabular-nums">
                <span className="font-semibold">{t.weekdaysShort[day.weekday]}</span> {day.start}–
                {day.end}
              </li>
            ))}
          </ul>
        )
      ) : (
        <Spinner className="text-accent" label={ptBR.common.loading} />
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        <Button
          variant="secondary"
          icon={Pencil}
          disabled={!data}
          aria-label={t.editDataOf(professional.name)}
          onClick={() => {
            if (data) onEdit(data);
          }}
        >
          {t.editData}
        </Button>
        <Button
          variant="secondary"
          icon={CalendarCog}
          disabled={!data}
          aria-label={t.editScheduleOf(professional.name)}
          onClick={() => {
            if (data) onSchedule(data);
          }}
        >
          {t.editSchedule}
        </Button>
        <Button
          variant="ghost"
          icon={Power}
          disabled={mutations.setProfessionalActive.isPending}
          aria-label={
            professional.active
              ? c.deactivateItem(professional.name)
              : c.activateItem(professional.name)
          }
          onClick={() => {
            mutations.setProfessionalActive.mutate({
              id: professional.id,
              active: !professional.active,
            });
          }}
        >
          {professional.active ? c.deactivate : c.activate}
        </Button>
      </div>
    </Card>
  );
}
