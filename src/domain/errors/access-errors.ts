import type { Permission } from '../services/access-control';
import { DomainError } from './DomainError';

export class PermissionDeniedError extends DomainError {
  readonly code = 'PERMISSION_DENIED';
  readonly permission: Permission;

  constructor(permission: Permission) {
    super(`Missing permission: ${permission}.`);
    this.permission = permission;
  }
}
