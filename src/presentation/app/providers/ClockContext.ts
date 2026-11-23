import type { Clock } from '@application/ports/Clock';
import { createContext } from 'react';

const systemClock: Clock = { now: () => new Date() };

/**
 * "What time is it?" for the UI (today's date, no-show tolerance…). The composition root
 * passes the same Clock the use cases use, so tests can freeze time for screens too.
 */
export const ClockContext = createContext<Clock>(systemClock);
