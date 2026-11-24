import type { Permission } from '../services/access-control';
import { DomainError } from './DomainError';

export class PermissionDeniedError extends DomainError {
  readonly code = 'PERMISSION_DENIED';
  /** 'staff': only people who work at the barbershop; 'client': only client accounts. */
  readonly permission: Permission | 'staff' | 'client';

  constructor(permission: Permission | 'staff' | 'client') {
    super(`Missing permission: ${permission}.`);
    this.permission = permission;
  }
}
