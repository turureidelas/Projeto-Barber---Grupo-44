import { ptBR } from '../../i18n/pt-BR';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "06:00" … "23:45" every 15 minutes, plus "24:00" — for working hours and blocks. */
export const TIME_OPTIONS = Array.from({ length: (24 - 6) * 4 + 1 }, (_, index) => {
  const minutes = 6 * 60 + index * 15;
  const time = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  return { value: time, label: time };
});

/** 10 min … 4h, every 5 minutes — service durations. */
export const DURATION_OPTIONS = Array.from({ length: (240 - 10) / 5 + 1 }, (_, index) => {
  const minutes = 10 + index * 5;
  return { value: String(minutes), label: ptBR.services.minutes(minutes) };
});
