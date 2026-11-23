import { describe, expect, it } from 'vitest';
import { aPolicy, anAppointment, at, reais } from '../testing/builders';
import { summarizeClientHistory } from './client-history';

const visit = (date: string, paid: number) =>
  anAppointment({ start: at('10:00', date) }).complete({
    amountPaid: reais(paid),
    paymentMethod: 'PIX',
    now: at('10:30', date),
  });

describe('summarizeClientHistory', () => {
  it('summarizes an empty history', () => {
    expect(summarizeClientHistory([])).toEqual({
      visits: 0,
      noShows: 0,
      cancellations: 0,
      lastVisit: null,
      averageDaysBetweenVisits: null,
      totalSpent: reais(0),
    });
  });

  it('counts visits, no-shows and cancellations, and how often the client returns', () => {
    const noShow = anAppointment({ start: at('10:00', '2026-10-20') }).markNoShow(
      at('11:00', '2026-10-20'),
      aPolicy(),
    );
    const cancelled = anAppointment({ start: at('10:00', '2026-11-25') }).cancel({
      by: 'CLIENT',
      reason: null,
      now: at('08:00', '2026-11-20'),
      policy: aPolicy(),
    });
    const upcoming = anAppointment({ start: at('10:00', '2026-12-01') });

    // Out of order on purpose: visits every 14 days on average (10, 18 days).
    const summary = summarizeClientHistory([
      visit('2026-11-11', 50),
      noShow,
      visit('2026-10-14', 45),
      cancelled,
      visit('2026-10-24', 70),
      upcoming,
    ]);

    expect(summary.visits).toBe(3);
    expect(summary.noShows).toBe(1);
    expect(summary.cancellations).toBe(1);
    expect(summary.lastVisit).toEqual(at('10:00', '2026-11-11'));
    expect(summary.averageDaysBetweenVisits).toBe(14);
    expect(summary.totalSpent.cents).toBe(16500);
  });

  it('has no return frequency with a single visit', () => {
    expect(summarizeClientHistory([visit('2026-11-11', 45)]).averageDaysBetweenVisits).toBeNull();
  });
});
