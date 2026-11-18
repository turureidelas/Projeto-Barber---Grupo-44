import { describe, expect, it } from 'vitest';
import type { ProfessionalId } from '../entities/ids';
import type { Role } from '../entities/User';
import { PermissionDeniedError } from '../errors/access-errors';
import { ids } from '../testing/builders';
import {
  assertCanManageAgendaOf,
  assertCanManageTimeBlocksOf,
  assertPermission,
  canManageAgendaOf,
  canManageTimeBlocksOf,
  canViewReportsOf,
  hasPermission,
  permissionsFor,
  type Permission,
} from './access-control';

const owner = { role: 'OWNER' as Role, professionalId: ids.ricardo };
const barber = { role: 'PROFESSIONAL' as Role, professionalId: ids.bruno };
const receptionist = { role: 'RECEPTIONIST' as Role, professionalId: null };

describe('access control (RBAC)', () => {
  const matrix: [Permission, boolean, boolean, boolean][] = [
    //                          owner  barber  receptionist
    ['agenda:manage-all', true, false, true],
    ['agenda:manage-own', true, true, false],
    ['time-blocks:manage-all', true, false, false],
    ['time-blocks:manage-own', true, true, false],
    ['clients:manage', true, false, true],
    ['services:manage', true, false, false],
    ['professionals:manage', true, false, false],
    ['schedules:manage', true, false, false],
    ['reports:view-all', true, false, false],
    ['reports:view-own', true, true, false],
    ['settings:manage', true, false, false],
  ];

  it.each(matrix)('%s → owner %s, barber %s, receptionist %s', (permission, o, b, r) => {
    expect(hasPermission(owner, permission)).toBe(o);
    expect(hasPermission(barber, permission)).toBe(b);
    expect(hasPermission(receptionist, permission)).toBe(r);
  });

  it('lists the permissions of each role', () => {
    expect(permissionsFor(owner)).toHaveLength(11);
    expect(permissionsFor(receptionist)).toEqual(['agenda:manage-all', 'clients:manage']);
  });

  it('throws a typed error when a permission is missing', () => {
    expect(() => {
      assertPermission(receptionist, 'reports:view-all');
    }).toThrow(PermissionDeniedError);
    expect(() => {
      assertPermission(owner, 'settings:manage');
    }).not.toThrow();
  });

  describe('own vs. everyone', () => {
    const someone: ProfessionalId = ids.ricardo;

    it('barbers act only on their own agenda, blocks and reports', () => {
      expect(canManageAgendaOf(barber, ids.bruno)).toBe(true);
      expect(canManageAgendaOf(barber, someone)).toBe(false);
      expect(canManageTimeBlocksOf(barber, ids.bruno)).toBe(true);
      expect(canManageTimeBlocksOf(barber, someone)).toBe(false);
      expect(canViewReportsOf(barber, ids.bruno)).toBe(true);
      expect(canViewReportsOf(barber, someone)).toBe(false);
    });

    it('receptionists manage every agenda but not blocks or reports', () => {
      expect(canManageAgendaOf(receptionist, someone)).toBe(true);
      expect(canManageTimeBlocksOf(receptionist, someone)).toBe(false);
      expect(canViewReportsOf(receptionist, someone)).toBe(false);
    });

    it('owners can do everything for everyone', () => {
      expect(canManageAgendaOf(owner, ids.bruno)).toBe(true);
      expect(canManageTimeBlocksOf(owner, ids.bruno)).toBe(true);
      expect(canViewReportsOf(owner, ids.bruno)).toBe(true);
    });

    it('a "manage-own" user without a professional profile owns nothing', () => {
      const orphan = { role: 'PROFESSIONAL' as Role, professionalId: null };
      expect(canManageAgendaOf(orphan, someone)).toBe(false);
    });

    it('assert helpers throw PermissionDeniedError', () => {
      expect(() => {
        assertCanManageAgendaOf(barber, someone);
      }).toThrow(PermissionDeniedError);
      expect(() => {
        assertCanManageTimeBlocksOf(receptionist, someone);
      }).toThrow(PermissionDeniedError);
      expect(() => {
        assertCanManageAgendaOf(barber, ids.bruno);
        assertCanManageTimeBlocksOf(barber, ids.bruno);
      }).not.toThrow();
    });
  });
});
