import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { Spinner } from '../components/ui/Spinner'

// Eagerly loaded (always needed at startup)
import { LoginPage } from '../pages/auth/LoginPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'

// Lazy-loaded — each becomes its own JS chunk, only downloaded when visited
const ResidentDashboard     = lazy(() => import('../pages/resident/ResidentDashboard').then(m => ({ default: m.ResidentDashboard })))
const MyAttendancePage      = lazy(() => import('../pages/resident/MyAttendancePage').then(m => ({ default: m.MyAttendancePage })))

const SupervisorHome        = lazy(() => import('../pages/supervisor/SupervisorHome').then(m => ({ default: m.SupervisorHome })))
const SessionHistoryPage    = lazy(() => import('../pages/supervisor/SessionHistoryPage').then(m => ({ default: m.SessionHistoryPage })))
const MarkAttendancePage    = lazy(() => import('../pages/supervisor/MarkAttendancePage').then(m => ({ default: m.MarkAttendancePage })))

const AdminDashboard        = lazy(() => import('../pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminManagePage       = lazy(() => import('../pages/admin/AdminManagePage').then(m => ({ default: m.AdminManagePage })))
const AspiriantsPage        = lazy(() => import('../pages/admin/AspiriantsPage').then(m => ({ default: m.AspiriantsPage })))
const StudentsAdminPage     = lazy(() => import('../pages/admin/StudentsAdminPage').then(m => ({ default: m.StudentsAdminPage })))
const StudentsPage          = lazy(() => import('../pages/supervisor/StudentsPage').then(m => ({ default: m.StudentsPage })))

const SkillsPlaceholderPage = lazy(() => import('../pages/skills/SkillsPlaceholderPage').then(m => ({ default: m.SkillsPlaceholderPage })))
const AssignmentLogPage     = lazy(() => import('../pages/shared/AssignmentLogPage').then(m => ({ default: m.AssignmentLogPage })))
const CalendarPage          = lazy(() => import('../pages/shared/CalendarPage').then(m => ({ default: m.CalendarPage })))
const TasksPage             = lazy(() => import('../pages/shared/TasksPage').then(m => ({ default: m.TasksPage })))

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-brand">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

function RoleRedirect() {
  const { appUser, loading, session } = useAuth()

  if (loading || (session && !appUser)) return <PageLoader />
  if (!appUser) return <Navigate to="/login" replace />
  if (appUser.role === 'admin') return <Navigate to="/admin" replace />
  if (appUser.role === 'supervisor') return <Navigate to="/supervisor" replace />
  return <Navigate to="/resident" replace />
}

function R({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={roles as never}>{children}</ProtectedRoute>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Resident */}
          <Route path="/resident"            element={<R roles={['resident']}><ResidentDashboard /></R>} />
          <Route path="/resident/attendance" element={<R roles={['resident']}><MyAttendancePage /></R>} />
          <Route path="/resident/calendar"   element={<R roles={['resident']}><CalendarPage /></R>} />
          <Route path="/resident/tasks"      element={<R roles={['resident']}><TasksPage /></R>} />
          <Route path="/resident/skills"     element={<R roles={['resident']}><SkillsPlaceholderPage /></R>} />

          {/* Supervisor */}
          <Route path="/supervisor"                        element={<R roles={['supervisor']}><SupervisorHome /></R>} />
          <Route path="/supervisor/sessions"               element={<R roles={['supervisor']}><SessionHistoryPage /></R>} />
          <Route path="/supervisor/session/:sessionId/mark" element={<R roles={['supervisor']}><MarkAttendancePage /></R>} />
          <Route path="/supervisor/calendar"               element={<R roles={['supervisor']}><CalendarPage /></R>} />
          <Route path="/supervisor/tasks"                  element={<R roles={['supervisor']}><TasksPage /></R>} />
          <Route path="/supervisor/students"               element={<R roles={['supervisor']}><StudentsPage /></R>} />
          <Route path="/supervisor/logs"                   element={<R roles={['supervisor']}><AssignmentLogPage /></R>} />

          {/* Admin */}
          <Route path="/admin"            element={<R roles={['admin']}><AdminDashboard /></R>} />
          <Route path="/admin/manage"     element={<R roles={['admin']}><AdminManagePage /></R>} />
          <Route path="/admin/calendar"   element={<R roles={['admin']}><CalendarPage /></R>} />
          <Route path="/admin/tasks"      element={<R roles={['admin']}><TasksPage /></R>} />
          <Route path="/admin/aspirants"  element={<R roles={['admin']}><AspiriantsPage /></R>} />
          <Route path="/admin/students"   element={<R roles={['admin']}><StudentsAdminPage /></R>} />
          <Route path="/admin/logs"       element={<R roles={['admin']}><AssignmentLogPage /></R>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
