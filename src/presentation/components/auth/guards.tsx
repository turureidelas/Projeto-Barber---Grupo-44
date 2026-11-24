import type { Permission } from '@domain/services/access-control';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { paths } from '../../app/routes';
import { errorMessage } from '../../i18n/errors';
import { hasAny, useCurrentUser, useSession } from '../../hooks/useSession';
import { ForbiddenPage } from '../../pages/system/ForbiddenPage';
import { ErrorState, LoadingState } from '../ui/states';

type Area = 'staff' | 'client';

/**
 * Only signed-in users of `area` pass. Signed-out people go to that area's login and come back
 * afterwards; someone from the other area is sent to their own home.
 */
function RequireArea({ area }: { readonly area: Area }) {
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
    const login = area === 'client' ? paths.client.login : paths.login;
    return <Navigate to={login} replace state={{ from: location.pathname }} />;
  }
  const isClient = session.data.role === 'CLIENT';
  if (area === 'staff' && isClient) {
    return <Navigate to={paths.client.home} replace />;
  }
  if (area === 'client' && !isClient) {
    return <Navigate to={paths.today} replace />;
  }
  return <Outlet />;
}

/** Layout route of the panel (staff). */
export function RequireAuth() {
  return <RequireArea area="staff" />;
}

/** Layout route of the client area. */
export function RequireClient() {
  return <RequireArea area="client" />;
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
