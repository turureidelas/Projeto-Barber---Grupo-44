import type { UseCases } from '@application/use-cases';
import { useContext } from 'react';
import { UseCasesContext } from '../app/providers/UseCasesContext';

export function useUseCases(): UseCases {
  const useCases = useContext(UseCasesContext);
  if (!useCases) {
    throw new Error('useUseCases must be used inside <UseCasesProvider>.');
  }
  return useCases;
}
