/** Source of the current time. Injected so use cases are deterministic in tests. */
export interface Clock {
  now(): Date;
}
