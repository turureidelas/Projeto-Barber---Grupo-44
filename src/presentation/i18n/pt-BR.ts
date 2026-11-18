/**
 * Todos os textos de interface em pt-BR ficam aqui.
 * Linguagem simples, sem jargão (ex.: "Cliente faltou", não "No-show").
 */
export const ptBR = {
  app: {
    name: 'Na Régua',
    tagline: 'A agenda da sua barbearia, sem confusão.',
    underConstruction: 'Painel em construção. Em breve: agenda do dia, clientes e relatórios.',
  },
} as const;

export type Messages = typeof ptBR;
