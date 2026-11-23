import { errorCodeOf } from '@application/errors';
import { ptBR } from './pt-BR';

/** Friendly pt-BR message for anything a use case may throw. */
export function errorMessage(error: unknown): string {
  return ptBR.errors[errorCodeOf(error)];
}
