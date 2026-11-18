import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.union([z.url(), z.literal('')]).default(''),
  VITE_USE_MOCKS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

export interface AppEnv {
  readonly apiUrl: string;
  readonly useMocks: boolean;
}

export function parseEnv(source: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variáveis de ambiente inválidas: ${fields}. Veja .env.example.`);
  }
  if (!result.data.VITE_USE_MOCKS && result.data.VITE_API_URL === '') {
    throw new Error('VITE_API_URL é obrigatória quando VITE_USE_MOCKS=false.');
  }
  return { apiUrl: result.data.VITE_API_URL, useMocks: result.data.VITE_USE_MOCKS };
}

export const env: AppEnv = parseEnv(import.meta.env);
