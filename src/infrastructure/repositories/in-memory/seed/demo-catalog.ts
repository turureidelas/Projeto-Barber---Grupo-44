import type { Role } from '@domain/entities/User';
import type { Weekday } from '@domain/value-objects/LocalDate';

/**
 * Static demo data for "Barbearia Nova Era". Every person, phone and e-mail here is fictional
 * (".demo" domains, made-up numbers).
 */

export const DEMO_PASSWORD = 'demo123';
export const SHOP_ID = 'shop-nova-era';

export interface DemoAccount {
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  readonly professionalId: string | null;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    userId: 'user-ricardo',
    name: 'Ricardo Almeida',
    email: 'ricardo@novaera.demo',
    role: 'OWNER',
    professionalId: 'pro-ricardo',
  },
  {
    userId: 'user-bruno',
    name: 'Bruno Santos',
    email: 'bruno@novaera.demo',
    role: 'PROFESSIONAL',
    professionalId: 'pro-bruno',
  },
  {
    userId: 'user-diego',
    name: 'Diego Lima',
    email: 'diego@novaera.demo',
    role: 'PROFESSIONAL',
    professionalId: 'pro-diego',
  },
  {
    userId: 'user-camila',
    name: 'Camila Rocha',
    email: 'camila@novaera.demo',
    role: 'RECEPTIONIST',
    professionalId: null,
  },
];

type Shift = readonly [
  open: string,
  close: string,
  breaks?: readonly (readonly [string, string])[],
];

export interface DemoProfessional {
  readonly id: string;
  readonly name: string;
  readonly specialty: string;
  readonly commissionPercent: number;
  readonly shifts: Partial<Record<Weekday, Shift>>;
}

const RICARDO_WEEKDAY: Shift = ['09:00', '19:00', [['12:00', '13:00']]];
const BRUNO_WEEKDAY: Shift = ['10:00', '20:00', [['14:00', '15:00']]];
const DIEGO_DAY: Shift = ['09:00', '18:00', [['12:30', '13:30']]];

export const DEMO_PROFESSIONALS: readonly DemoProfessional[] = [
  {
    id: 'pro-ricardo',
    name: 'Ricardo Almeida',
    specialty: 'Cortes clássicos e barba',
    commissionPercent: 100, // owner keeps everything
    shifts: {
      2: RICARDO_WEEKDAY,
      3: RICARDO_WEEKDAY,
      4: RICARDO_WEEKDAY,
      5: RICARDO_WEEKDAY,
      6: ['08:00', '16:00', [['12:00', '12:30']]],
    },
  },
  {
    id: 'pro-bruno',
    name: 'Bruno Santos',
    specialty: 'Degradê e desenhos',
    commissionPercent: 40,
    shifts: {
      1: BRUNO_WEEKDAY,
      2: BRUNO_WEEKDAY,
      3: BRUNO_WEEKDAY,
      4: BRUNO_WEEKDAY,
      5: BRUNO_WEEKDAY,
      6: ['08:00', '16:00'],
    },
  },
  {
    id: 'pro-diego',
    name: 'Diego Lima',
    specialty: 'Barba e tratamentos (aluga cadeira)',
    commissionPercent: 60,
    shifts: { 1: DIEGO_DAY, 3: DIEGO_DAY, 4: DIEGO_DAY, 5: DIEGO_DAY, 6: DIEGO_DAY },
  },
];

export interface DemoService {
  readonly id: string;
  readonly name: string;
  readonly durationMinutes: number;
  readonly priceCents: number;
  /** Relative popularity when generating appointments. */
  readonly weight: number;
  readonly comboOf?: readonly string[];
}

export const DEMO_SERVICES: readonly DemoService[] = [
  { id: 'svc-corte', name: 'Corte', durationMinutes: 30, priceCents: 4500, weight: 34 },
  { id: 'svc-barba', name: 'Barba', durationMinutes: 30, priceCents: 3500, weight: 12 },
  { id: 'svc-pezinho', name: 'Pezinho', durationMinutes: 15, priceCents: 1500, weight: 8 },
  { id: 'svc-sobrancelha', name: 'Sobrancelha', durationMinutes: 15, priceCents: 1500, weight: 4 },
  { id: 'svc-infantil', name: 'Corte infantil', durationMinutes: 30, priceCents: 4000, weight: 8 },
  { id: 'svc-hidratacao', name: 'Hidratação', durationMinutes: 20, priceCents: 2500, weight: 5 },
  { id: 'svc-platinado', name: 'Platinado', durationMinutes: 120, priceCents: 15000, weight: 3 },
  {
    id: 'svc-combo-corte-barba',
    name: 'Corte + Barba',
    durationMinutes: 50,
    priceCents: 7000,
    weight: 20,
    comboOf: ['svc-corte', 'svc-barba'],
  },
  {
    id: 'svc-combo-completo',
    name: 'Combo completo (corte, barba e sobrancelha)',
    durationMinutes: 60,
    priceCents: 8000,
    weight: 6,
    comboOf: ['svc-corte', 'svc-barba', 'svc-sobrancelha'],
  },
];

const FIRST_NAMES = [
  'João',
  'Lucas',
  'Matheus',
  'Gabriel',
  'Rafael',
  'Felipe',
  'Gustavo',
  'Thiago',
  'André',
  'Vinícius',
  'Leonardo',
  'Caio',
  'Eduardo',
  'Henrique',
  'Marcelo',
  'Rodrigo',
  'Daniel',
  'Pedro',
  'Samuel',
  'Otávio',
  'Igor',
  'Renan',
  'Diogo',
  'Murilo',
  'Enzo',
  'Arthur',
  'Bernardo',
  'Heitor',
  'Fábio',
  'Sérgio',
  'Paulo',
  'Wellington',
  'Bruno',
  'Ricardo',
  'Alexandre',
  'Fernando',
  'Carlos',
  'Miguel',
  'Davi',
  'Luiz',
] as const;

const SURNAMES = [
  'Silva',
  'Oliveira',
  'Souza',
  'Ferreira',
  'Costa',
  'Rodrigues',
  'Martins',
  'Pereira',
  'Carvalho',
  'Gomes',
  'Ribeiro',
  'Barbosa',
  'Alves',
  'Nascimento',
  'Araújo',
  'Teixeira',
  'Moreira',
  'Lopes',
  'Cardoso',
  'Mendes',
  'Freitas',
  'Batista',
  'Castro',
  'Rocha',
  'Correia',
  'Dias',
  'Pinto',
  'Monteiro',
  'Cunha',
  'Ramos',
] as const;

const CLIENT_COUNT = 360;

/**
 * 360 distinct fictional clients (every first name × surname, in order), so each one comes back
 * every couple of weeks — like a real 3-chair barbershop — instead of every other day.
 */
export const DEMO_CLIENT_NAMES: readonly [string, ...string[]] = [
  'João Pedro Silva',
  ...Array.from({ length: CLIENT_COUNT - 1 }, (_, index) => {
    const position = index + 1;
    const first = FIRST_NAMES[position % FIRST_NAMES.length] ?? '';
    const last = SURNAMES[Math.floor(position / FIRST_NAMES.length) % SURNAMES.length] ?? '';
    return `${first} ${last}`;
  }),
];
