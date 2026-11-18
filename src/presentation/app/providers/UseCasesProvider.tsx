import type { UseCases } from '@application/use-cases';
import type { ReactNode } from 'react';
import { UseCasesContext } from './UseCasesContext';

interface UseCasesProviderProps {
  readonly useCases: UseCases;
  readonly children: ReactNode;
}

export function UseCasesProvider({ useCases, children }: UseCasesProviderProps) {
  return <UseCasesContext value={useCases}>{children}</UseCasesContext>;
}
