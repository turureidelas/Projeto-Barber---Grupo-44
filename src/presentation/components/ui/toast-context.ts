import { createContext } from 'react';

export type ToastTone = 'success' | 'error';

export interface ToastAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface ToastOptions {
  /** e.g. "Desfazer" — lets one-tap actions skip a confirmation dialog. */
  readonly action?: ToastAction;
}

export interface ToastApi {
  /** Short confirmation after an action ("Horário bloqueado"). */
  success(message: string, options?: ToastOptions): void;
  error(message: string): void;
}

export const ToastContext = createContext<ToastApi | null>(null);
