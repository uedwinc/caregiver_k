import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import JoinPage from './pages/auth/JoinPage';

// App layout
import AppLayout from './components/layout/AppLayout';

// Main pages
import OnboardingPage from './pages/OnboardingPage';
import TodayPage from './pages/TodayPage';
import PlanPage from './pages/PlanPage';
import CalendarPage from './pages/CalendarPage';
import MedsPage from './pages/MedsPage';
import VaultPage from './pages/VaultPage';
import CareLogPage from './pages/CareLogPage';
import EmergencyPage from './pages/EmergencyPage';
import EmergencySharePage from './pages/EmergencySharePage';
import MembersPage from './pages/MembersPage';
import ExportsPage from './pages/ExportsPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireCircle({ children }: { children: React.ReactNode }) {
  const activeCareCircle = useAppStore((s) => s.activeCareCircle);
  if (!activeCareCircle) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  const { highContrastMode, largeTextMode } = useAppStore();

  return (
    <div className={`${highContrastMode ? 'contrast-more' : ''} ${largeTextMode ? 'text-lg' : ''}`}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/join/:token" element={<JoinPage />} />
          <Route path="/emergency/share/:token" element={<EmergencySharePage />} />

          {/* Protected routes */}
          <Route path="/onboarding" element={
            <RequireAuth><OnboardingPage /></RequireAuth>
          } />

          <Route path="/" element={
            <RequireAuth>
              <RequireCircle>
                <AppLayout />
              </RequireCircle>
            </RequireAuth>
          }>
            <Route index element={<Navigate to="/today" replace />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="meds" element={<MedsPage />} />
            <Route path="vault" element={<VaultPage />} />
            <Route path="care-log" element={<CareLogPage />} />
            <Route path="emergency" element={<EmergencyPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="exports" element={<ExportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
