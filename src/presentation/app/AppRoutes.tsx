import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import { RequireAuth, RequireClient, RequirePermission } from '../components/auth/guards';
import { AppShell } from '../components/layout/AppShell';
import { LoadingState } from '../components/ui/states';
import { LoginPage } from '../pages/login/LoginPage';
import { NotFoundPage } from '../pages/system/NotFoundPage';
import { TodayPage } from '../pages/today/TodayPage';
import { paths, ROUTE_PERMISSIONS } from './routes';

/*
 * Code splitting: the agenda of the day (home) and login load right away; the other screens
 * are fetched the first time they are opened (AppShell shows a loading state meanwhile).
 */
const WeekPage = lazy(() =>
  import('../pages/week/WeekPage').then((m) => ({ default: m.WeekPage })),
);
const ClientsPage = lazy(() =>
  import('../pages/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })),
);
const ClientDetailsPage = lazy(() =>
  import('../pages/clients/ClientDetailsPage').then((m) => ({ default: m.ClientDetailsPage })),
);
const ServicesPage = lazy(() =>
  import('../pages/services/ServicesPage').then((m) => ({ default: m.ServicesPage })),
);
const ProfessionalsPage = lazy(() =>
  import('../pages/professionals/ProfessionalsPage').then((m) => ({
    default: m.ProfessionalsPage,
  })),
);
const ReportsPage = lazy(() =>
  import('../pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import('../pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const MorePage = lazy(() =>
  import('../pages/more/MorePage').then((m) => ({ default: m.MorePage })),
);

/* Client area: its own chunks, so the panel never downloads them (and vice versa). */
const ClientLoginPage = lazy(() =>
  import('../pages/client/ClientLoginPage').then((m) => ({ default: m.ClientLoginPage })),
);
const ClientSignUpPage = lazy(() =>
  import('../pages/client/ClientSignUpPage').then((m) => ({ default: m.ClientSignUpPage })),
);
const ClientShell = lazy(() =>
  import('../components/client-area/ClientShell').then((m) => ({ default: m.ClientShell })),
);
const MyAppointmentsPage = lazy(() =>
  import('../pages/client/MyAppointmentsPage').then((m) => ({ default: m.MyAppointmentsPage })),
);
const BookAppointmentPage = lazy(() =>
  import('../pages/client/BookAppointmentPage').then((m) => ({
    default: m.BookAppointmentPage,
  })),
);
const ClientAccountPage = lazy(() =>
  import('../pages/client/ClientAccountPage').then((m) => ({ default: m.ClientAccountPage })),
);

/** Lazy screens outside a layout (which has its own Suspense). */
function Lazy({ children }: { readonly children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh">
          <LoadingState />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path={paths.login} element={<LoginPage />} />

      {/* Client area */}
      <Route
        path={paths.client.login}
        element={
          <Lazy>
            <ClientLoginPage />
          </Lazy>
        }
      />
      <Route
        path={paths.client.signUp}
        element={
          <Lazy>
            <ClientSignUpPage />
          </Lazy>
        }
      />
      <Route element={<RequireClient />}>
        <Route
          element={
            <Lazy>
              <ClientShell />
            </Lazy>
          }
        >
          <Route path={paths.client.home} element={<MyAppointmentsPage />} />
          <Route path={paths.client.book} element={<BookAppointmentPage />} />
          <Route path={paths.client.account} element={<ClientAccountPage />} />
          <Route path={`${paths.client.home}/*`} element={<NotFoundPage />} />
        </Route>
      </Route>

      {/* Panel (staff) */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<TodayPage />} />
          <Route path={paths.week} element={<WeekPage />} />
          <Route
            path={paths.clients}
            element={
              <RequirePermission anyOf={ROUTE_PERMISSIONS.clients}>
                <ClientsPage />
              </RequirePermission>
            }
          />
          <Route
            path={paths.clientDetails(':clientId')}
            element={
              <RequirePermission anyOf={ROUTE_PERMISSIONS.clients}>
                <ClientDetailsPage />
              </RequirePermission>
            }
          />
          <Route
            path={paths.services}
            element={
              <RequirePermission anyOf={ROUTE_PERMISSIONS.services}>
                <ServicesPage />
              </RequirePermission>
            }
          />
          <Route
            path={paths.professionals}
            element={
              <RequirePermission anyOf={ROUTE_PERMISSIONS.professionals}>
                <ProfessionalsPage />
              </RequirePermission>
            }
          />
          <Route
            path={paths.reports}
            element={
              <RequirePermission anyOf={ROUTE_PERMISSIONS.reports}>
                <ReportsPage />
              </RequirePermission>
            }
          />
          <Route
            path={paths.settings}
            element={
              <RequirePermission anyOf={ROUTE_PERMISSIONS.settings}>
                <SettingsPage />
              </RequirePermission>
            }
          />
          <Route path={paths.more} element={<MorePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
