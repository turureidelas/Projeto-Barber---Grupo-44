import type { ClientInput } from '@application/use-cases';
import { z } from 'zod';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.clients;

/** Brazilian phone with area code (the domain validates it again). */
function looksLikePhone(value: string): boolean {
  let digits = value.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  return /^[1-9]{2}\d{8,9}$/.test(digits);
}

const baseSchema = z.object({
  name: z.string().trim().min(1, ptBR.catalog.nameRequired).max(80),
  phone: z.string().trim().refine(looksLikePhone, t.phoneInvalid),
  email: z.union([z.literal(''), z.email(t.emailInvalid)]),
  consent: z.boolean(),
});

/** New clients must authorize storing their data (LGPD); edits don't ask again. */
export function clientSchema(requireConsent: boolean) {
  return requireConsent
    ? baseSchema.refine((values) => values.consent, {
        path: ['consent'],
        message: t.consentRequired,
      })
    : baseSchema;
}

export type ClientFormValues = z.infer<typeof baseSchema>;

export function toClientInput(values: ClientFormValues): ClientInput {
  const email = values.email.trim();
  return { name: values.name, phone: values.phone, email: email === '' ? null : email };
}
