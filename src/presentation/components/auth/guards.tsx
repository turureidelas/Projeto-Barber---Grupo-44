import type { Permission } from '@domain/services/access-control';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { paths } from '../../app/routes';
import { errorMessage } from '../../i18n/errors';
import { hasAny, useCurrentUser, useSession } from '../../hooks/useSession';
import { ForbiddenPage } from '../../pages/system/ForbiddenPage';
import { ErrorState, LoadingState } from '../ui/states';

/** Layout route: only signed-in users pass; others go to login and come back afterwards. */
export function RequireAuth() {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) {
    return (
      <div className="min-h-dvh">
        <LoadingState />
      </div>
    );
  }
  if (session.isError) {
    return (
      <div className="mx-auto max-w-md p-4 pt-16">
        <ErrorState message={errorMessage(session.error)} onRetry={() => void session.refetch()} />
      </div>
    );
  }
  if (!session.data) {
    return <Navigate to={paths.login} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

interface RequirePermissionProps {
  readonly anyOf: readonly Permission[];
  readonly children: ReactNode;
}

/** Hides a screen from profiles that cannot use it (the use cases enforce it again). */
export function RequirePermission({ anyOf, children }: RequirePermissionProps) {
  const user = useCurrentUser();
  return hasAny(user, anyOf) ? children : <ForbiddenPage />;
}
