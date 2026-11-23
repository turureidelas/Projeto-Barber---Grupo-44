import type { ErrorCode } from '@application/errors';
import type { PaymentMethod } from '@domain/entities/Appointment';
import type { AppointmentStatus } from '@domain/entities/AppointmentStatus';
import type { Role } from '@domain/entities/User';

/**
 * Todos os textos de interface em pt-BR ficam aqui.
 * Linguagem simples, sem jargão (ex.: "Cliente faltou", não "No-show").
 */
export const ptBR = {
  app: {
    name: 'Na Régua',
    tagline: 'A agenda da sua barbearia, sem confusão.',
    skipToContent: 'Pular para o conteúdo',
  },

  nav: {
    label: 'Menu principal',
    today: 'Hoje',
    week: 'Semana',
    clients: 'Clientes',
    services: 'Serviços',
    professionals: 'Equipe',
    reports: 'Relatórios',
    myNumbers: 'Meus números',
    settings: 'Configurações',
    more: 'Mais',
    signOut: 'Sair',
  },

  roles: {
    OWNER: 'Gestor',
    PROFESSIONAL: 'Profissional',
    RECEPTIONIST: 'Recepção',
  } satisfies Record<Role, string>,

  status: {
    SCHEDULED: 'Agendado',
    CONFIRMED: 'Confirmado',
    IN_SERVICE: 'Em atendimento',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
    NO_SHOW: 'Cliente faltou',
  } satisfies Record<AppointmentStatus, string>,

  paymentMethods: {
    CASH: 'Dinheiro',
    PIX: 'Pix',
    DEBIT_CARD: 'Débito',
    CREDIT_CARD: 'Crédito',
  } satisfies Record<PaymentMethod, string>,

  auth: {
    title: 'Entrar',
    subtitle: 'Use o e-mail e a senha da sua barbearia.',
    email: 'E-mail',
    password: 'Senha',
    submit: 'Entrar',
    submitting: 'Entrando…',
    emailRequired: 'Digite seu e-mail.',
    emailInvalid: 'Esse e-mail não parece certo.',
    passwordRequired: 'Digite sua senha.',
    demoTitle: 'Demonstração',
    demoHint: 'Entre com um toque em um dos perfis de teste:',
    demoSignInAs: (name: string, role: string) => `Entrar como ${name} (${role})`,
    sessionExpired: 'Sua sessão terminou. Entre de novo.',
  },

  demo: {
    reset: 'Resetar dados de demonstração',
    resetting: 'Resetando…',
    resetDone: 'Dados de demonstração restaurados.',
    resetConfirmTitle: 'Resetar os dados de demonstração?',
    resetConfirmBody:
      'Tudo o que foi feito na demonstração será apagado e os dados de exemplo voltam ao início.',
    badge: 'Modo demonstração',
  },

  common: {
    loading: 'Carregando…',
    retry: 'Tentar de novo',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    close: 'Fechar',
    back: 'Voltar',
    comingSoon: 'Em construção',
    comingSoonBody: 'Esta tela chega numa próxima etapa do projeto.',
  },

  pages: {
    hello: (firstName: string) => `Olá, ${firstName}`,
    today: 'Agenda de hoje',
    week: 'Agenda da semana',
    clients: 'Clientes',
    services: 'Serviços e combos',
    professionals: 'Equipe e escalas',
    reports: 'Relatórios',
    settings: 'Configurações',
    more: 'Mais opções',
    notFound: 'Página não encontrada',
    notFoundBody: 'O endereço que você abriu não existe.',
    goHome: 'Ir para a agenda de hoje',
    forbidden: 'Sem acesso',
    forbiddenBody: 'Seu perfil não tem acesso a esta tela. Fale com o gestor da barbearia.',
    crashTitle: 'Algo deu errado',
    crashBody: 'Tente recarregar a página. Se continuar, avise o suporte.',
    reload: 'Recarregar a página',
  },

  errors: {
    INVALID_VALUE: 'Algum dado está inválido. Confira e tente de novo.',
    SLOT_IN_PAST: 'Esse horário já passou.',
    OUTSIDE_WORKING_HOURS: 'Fora do horário de trabalho do profissional.',
    TIME_BLOCKED: 'Esse horário está bloqueado.',
    SCHEDULE_CONFLICT: 'Já tem cliente marcado nesse horário.',
    INVALID_STATUS_TRANSITION: 'Não dá para fazer isso com esse agendamento agora.',
    LATE_CHANGE_NOT_ALLOWED: 'Passou do prazo para cancelar ou remarcar.',
    CANCELLATION_REASON_REQUIRED: 'Está em cima da hora: escreva o motivo do cancelamento.',
    NO_SHOW_TOO_EARLY: 'Ainda está no tempo de tolerância. Espere um pouco para marcar a falta.',
    PERMISSION_DENIED: 'Seu perfil não pode fazer isso.',
    NOT_FOUND: 'Não encontramos esse item. Atualize a tela.',
    NOT_AUTHENTICATED: 'Sua sessão terminou. Entre de novo.',
    INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
    RESOURCE_INACTIVE: 'Esse serviço ou profissional está desativado.',
    UNEXPECTED: 'Algo deu errado. Tente de novo.',
  } satisfies Record<ErrorCode, string>,
} as const;

export type Messages = typeof ptBR;
