import { Route, Routes } from 'react-router';
import { RequireAuth, RequirePermission } from '../components/auth/guards';
import { AppShell } from '../components/layout/AppShell';
import { LoginPage } from '../pages/login/LoginPage';
import { MorePage } from '../pages/more/MorePage';
import { ClientDetailsPage } from '../pages/clients/ClientDetailsPage';
import { ClientsPage } from '../pages/clients/ClientsPage';
import { ReportsPage, SettingsPage } from '../pages/placeholders';
import { ProfessionalsPage } from '../pages/professionals/ProfessionalsPage';
import { ServicesPage } from '../pages/services/ServicesPage';
import { NotFoundPage } from '../pages/system/NotFoundPage';
import { TodayPage } from '../pages/today/TodayPage';
import { WeekPage } from '../pages/week/WeekPage';
import { paths, ROUTE_PERMISSIONS } from './routes';

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
