import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from './components/auth/AuthGuard';
import { ToastProvider } from './components/ui/ToastProvider';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/login/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TaskListPage } from './pages/tasks/TaskListPage';
import { TaskDetailPage } from './pages/tasks/TaskDetailPage';
import { MemberTaskListPage } from './pages/tasks/MemberTaskListPage';
import { ReportPage } from './pages/reports/ReportPage';
import { ContactPage } from './pages/contacts/ContactPage';
import { SettingsPage } from './pages/settings/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1分
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* 認証不要 */}
            <Route path="/login" element={<LoginPage />} />

            {/* 認証必須 */}
            <Route element={<AuthGuard />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/tasks" element={<TaskListPage />} />
                <Route path="/tasks/members" element={<MemberTaskListPage />} />
                <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
