import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Display helpers (pt-BR, São Paulo time). No business rules here. */

export const DISPLAY_TIME_ZONE = 'America/Sao_Paulo';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 4500 → "R$ 45,00" */
export function formatMoney(cents: number): string {
  return currency.format(cents / 100);
}

function zoned(value: string | Date): TZDate {
  const instant = typeof value === 'string' ? new Date(value) : value;
  return new TZDate(instant.getTime(), DISPLAY_TIME_ZONE);
}

/** ISO instant → "09:30" (São Paulo). */
export function formatTime(iso: string): string {
  return format(zoned(iso), 'HH:mm');
}

/** "yyyy-MM-dd" → "quarta-feira, 18 de novembro". */
export function formatLongDate(localDate: string): string {
  return format(parseLocalDate(localDate), "EEEE, d 'de' MMMM", { locale: ptBR });
}

/** "yyyy-MM-dd" → "18/11". */
export function formatShortDate(localDate: string): string {
  return format(parseLocalDate(localDate), 'dd/MM');
}

/** The calendar day of `now` in São Paulo, as "yyyy-MM-dd". */
export function toLocalDateString(now: Date): string {
  return format(zoned(now), 'yyyy-MM-dd');
}

/** "Ricardo Almeida" → "RA" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase();
}

function parseLocalDate(localDate: string): Date {
  const [year = 0, month = 1, day = 1] = localDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}
