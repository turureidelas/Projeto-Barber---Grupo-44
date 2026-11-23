import type { AppointmentStatus } from '@domain/entities/AppointmentStatus';
import { ptBR } from '../../i18n/pt-BR';
import { Badge, type BadgeTone } from '../ui/Badge';

const TONES: Record<AppointmentStatus, BadgeTone> = {
  SCHEDULED: 'neutral',
  CONFIRMED: 'info',
  IN_SERVICE: 'accent',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
};

export function StatusBadge({ status }: { readonly status: AppointmentStatus }) {
  return <Badge tone={TONES[status]}>{ptBR.status[status]}</Badge>;
}
