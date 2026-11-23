import type { AppointmentDTO, TimeBlockDTO } from '@application/dto/agenda';

export type TimelineEntry =
  | { readonly kind: 'appointment'; readonly item: AppointmentDTO }
  | { readonly kind: 'block'; readonly item: TimeBlockDTO };

/** Appointments and blocked times in a single chronological list. */
export function mergeTimeline(
  appointments: readonly AppointmentDTO[],
  blocks: readonly TimeBlockDTO[],
): TimelineEntry[] {
  return [
    ...appointments.map((item) => ({ kind: 'appointment' as const, item })),
    ...blocks.map((item) => ({ kind: 'block' as const, item })),
  ].sort((a, b) => Date.parse(a.item.start) - Date.parse(b.item.start));
}
