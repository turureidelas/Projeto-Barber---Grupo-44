import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import { RequireAuth, RequirePermission } from '../components/auth/guards';
import { AppShell } from '../components/layout/AppShell';
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

export function AppRoutes() {
  return (
    <Routes>
      <Route path={paths.login} element={<LoginPage />} />
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
