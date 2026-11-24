import type { SessionUserDTO } from '@application/dto/catalog';
import type { Permission } from '@domain/services/access-control';
import {
  CalendarClock,
  CalendarDays,
  ChartColumn,
  Scissors,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { hasAny } from '../hooks/useSession';
import { ptBR } from '../i18n/pt-BR';

/** URLs are in Portuguese (visible to users) and never carry personal data — only IDs. */
export const paths = {
  login: '/entrar',
  today: '/',
  week: '/semana',
  clients: '/clientes',
  clientDetails: (clientId: string) => `/clientes/${clientId}`,
  services: '/servicos',
  professionals: '/equipe',
  reports: '/relatorios',
  settings: '/configuracoes',
  more: '/mais',
  /** Client area: clients book and follow their own appointments. */
  client: {
    login: '/cliente/entrar',
    signUp: '/cliente/criar-conta',
    home: '/cliente',
    book: '/cliente/agendar',
    account: '/cliente/conta',
  },
} as const;

/** True for "/cliente" and "/cliente/..." (not the staff "/clientes" screen). */
export function isClientAreaPath(path: string): boolean {
  return path === paths.client.home || path.startsWith(`${paths.client.home}/`);
}

/** Where each kind of account lands after signing in. */
export function homeFor(user: Pick<SessionUserDTO, 'role'>): string {
  return user.role === 'CLIENT' ? paths.client.home : paths.today;
}

export interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: LucideIcon;
  /** The user needs at least one of these; null = everyone signed in. */
  readonly anyOf: readonly Permission[] | null;
  /** Shown in the phone's bottom bar (max. 4 + "Mais"); the rest live under "Mais". */
  readonly inBottomBar: boolean;
}

export const ROUTE_PERMISSIONS = {
  clients: ['clients:manage'],
  services: ['services:manage'],
  professionals: ['professionals:manage'],
  reports: ['reports:view-all', 'reports:view-own'],
  settings: ['settings:manage'],
} as const satisfies Record<string, readonly Permission[]>;

const NAV_ITEMS: readonly NavItem[] = [
  { to: paths.today, label: ptBR.nav.today, icon: CalendarClock, anyOf: null, inBottomBar: true },
  { to: paths.week, label: ptBR.nav.week, icon: CalendarDays, anyOf: null, inBottomBar: true },
  {
    to: paths.clients,
    label: ptBR.nav.clients,
    icon: Users,
    anyOf: ROUTE_PERMISSIONS.clients,
    inBottomBar: true,
  },
  {
    to: paths.reports,
    label: ptBR.nav.reports,
    icon: ChartColumn,
    anyOf: ROUTE_PERMISSIONS.reports,
    inBottomBar: true,
  },
  {
    to: paths.services,
    label: ptBR.nav.services,
    icon: Scissors,
    anyOf: ROUTE_PERMISSIONS.services,
    inBottomBar: false,
  },
  {
    to: paths.professionals,
    label: ptBR.nav.professionals,
    icon: UserCog,
    anyOf: ROUTE_PERMISSIONS.professionals,
    inBottomBar: false,
  },
  {
    to: paths.settings,
    label: ptBR.nav.settings,
    icon: Settings,
    anyOf: ROUTE_PERMISSIONS.settings,
    inBottomBar: false,
  },
];

/** Menu entries this user may open. A barber's "Relatórios" reads "Meus números". */
export function navItemsFor(user: SessionUserDTO): NavItem[] {
  return NAV_ITEMS.filter((item) => item.anyOf === null || hasAny(user, item.anyOf)).map((item) =>
    item.to === paths.reports && !user.permissions.includes('reports:view-all')
      ? { ...item, label: ptBR.nav.myNumbers }
      : item,
  );
}
