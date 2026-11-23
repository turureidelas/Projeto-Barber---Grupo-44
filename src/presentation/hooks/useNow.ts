import { toLocalDateString } from '@shared/format';
import { useContext, useEffect, useState } from 'react';
import { ClockContext } from '../app/providers/ClockContext';

const DEFAULT_TICK_MS = 30_000;

/** Current time, refreshed every `tickMs` so time-based UI (tolerance, "next") stays current. */
export function useNow(tickMs: number = DEFAULT_TICK_MS): Date {
  const clock = useContext(ClockContext);
  const [now, setNow] = useState(() => clock.now());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(clock.now());
    }, tickMs);
    return () => {
      clearInterval(id);
    };
  }, [clock, tickMs]);

  return now;
}

/** Today's date in São Paulo, "yyyy-MM-dd". */
export function useToday(): string {
  return toLocalDateString(useNow());
}
