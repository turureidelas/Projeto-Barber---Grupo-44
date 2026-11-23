import { createContext } from 'react';

export type ToastTone = 'success' | 'error';

export interface ToastApi {
  /** Short confirmation after an action ("Horário bloqueado"). */
  success(message: string): void;
  error(message: string): void;
}

export const ToastContext = createContext<ToastApi | null>(null);
