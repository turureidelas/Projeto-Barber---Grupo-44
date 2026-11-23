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

/** "2026-11-18" + 1 → "2026-11-19" (pure calendar math, no time zone involved). */
export function addDaysToLocalDate(localDate: string, days: number): string {
  const date = parseLocalDate(localDate);
  date.setDate(date.getDate() + days);
  return format(date, 'yyyy-MM-dd');
}

/** True for a well-formed "yyyy-MM-dd" that is a real calendar day. */
export function isLocalDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return format(parseLocalDate(value), 'yyyy-MM-dd') === value;
}

/** Monday of the week containing `localDate` ("yyyy-MM-dd"). */
export function startOfWeek(localDate: string): string {
  const date = parseLocalDate(localDate);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return addDaysToLocalDate(localDate, -daysSinceMonday);
}

/** "2026-11-18" → "qua" */
export function formatWeekdayShort(localDate: string): string {
  return format(parseLocalDate(localDate), 'EEEEEE', { locale: ptBR }).toLowerCase();
}

/** ISO instant → "qua, 18/11 às 10:00" (São Paulo). */
export function formatDateTime(iso: string): string {
  return format(zoned(iso), "EEEEEE, dd/MM 'às' HH:mm", { locale: ptBR }).toLowerCase();
}

/** "2026-11-18" + "09:30" in São Paulo → ISO instant. */
export function localDateTimeToIso(localDate: string, time: string): string {
  const [year = 0, month = 1, day = 1] = localDate.split('-').map(Number);
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return new TZDate(year, month - 1, day, hours, minutes, DISPLAY_TIME_ZONE).toISOString();
}

/** ISO instant → "yyyy-MM-dd" in São Paulo. */
export function isoToLocalDate(iso: string): string {
  return toLocalDateString(new Date(iso));
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
