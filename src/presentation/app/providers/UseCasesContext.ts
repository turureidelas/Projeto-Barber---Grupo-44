import type { UseCases } from '@application/use-cases';
import { createContext } from 'react';

/** Dependency injection for the UI: screens get use cases from here, never from infrastructure. */
export const UseCasesContext = createContext<UseCases | null>(null);
