import type { ProfessionalId } from '../entities/ids';
import type { Role, User } from '../entities/User';
import { PermissionDeniedError } from '../errors/access-errors';

export const PERMISSIONS = [
  /** See and act on (confirm, reschedule, cancel, arrival, payment) every professional's agenda. */
  'agenda:manage-all',
  /** See and act on the agenda of the user's own professional profile. */
  'agenda:manage-own',
  'time-blocks:manage-all',
  'time-blocks:manage-own',
  'clients:manage',
  /** Erase a client's personal data at their request (LGPD). Owner only. */
  'clients:anonymize',
  'services:manage',
  'professionals:manage',
  'schedules:manage',
  'reports:view-all',
  'reports:view-own',
  'settings:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  OWNER: PERMISSIONS,
  PROFESSIONAL: ['agenda:manage-own', 'time-blocks:manage-own', 'reports:view-own'],
  RECEPTIONIST: ['agenda:manage-all', 'clients:manage'],
};

export function hasPermission(user: Pick<User, 'role'>, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

/** Everything a user may do — used by the UI to show only what applies. */
export function permissionsFor(user: Pick<User, 'role'>): readonly Permission[] {
  return ROLE_PERMISSIONS[user.role];
}

export function assertPermission(user: Pick<User, 'role'>, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    throw new PermissionDeniedError(permission);
  }
}

type AccessUser = Pick<User, 'role' | 'professionalId'>;

function isOwnProfessional(user: AccessUser, professionalId: ProfessionalId): boolean {
  return user.professionalId !== null && user.professionalId === professionalId;
}

export function canManageAgendaOf(user: AccessUser, professionalId: ProfessionalId): boolean {
  return (
    hasPermission(user, 'agenda:manage-all') ||
    (hasPermission(user, 'agenda:manage-own') && isOwnProfessional(user, professionalId))
  );
}

export function canManageTimeBlocksOf(user: AccessUser, professionalId: ProfessionalId): boolean {
  return (
    hasPermission(user, 'time-blocks:manage-all') ||
    (hasPermission(user, 'time-blocks:manage-own') && isOwnProfessional(user, professionalId))
  );
}

export function canViewReportsOf(user: AccessUser, professionalId: ProfessionalId): boolean {
  return (
    hasPermission(user, 'reports:view-all') ||
    (hasPermission(user, 'reports:view-own') && isOwnProfessional(user, professionalId))
  );
}

export function assertCanManageAgendaOf(user: AccessUser, professionalId: ProfessionalId): void {
  if (!canManageAgendaOf(user, professionalId)) {
    throw new PermissionDeniedError('agenda:manage-own');
  }
}

export function assertCanManageTimeBlocksOf(
  user: AccessUser,
  professionalId: ProfessionalId,
): void {
  if (!canManageTimeBlocksOf(user, professionalId)) {
    throw new PermissionDeniedError('time-blocks:manage-own');
  }
}
