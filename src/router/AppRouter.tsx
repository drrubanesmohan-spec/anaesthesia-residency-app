import { lazy, Suspense, Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { Spinner } from '../components/ui/Spinner'

class ErrorBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null }
  static getDerivedStateFromError(e: Error) { return { err: e.message } }
  render() {
    if (this.state.err) return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white px-6">
        <p className="text-sm font-semibold text-red-500">Ошибка загрузки страницы</p>
        <p className="text-xs text-stone-400 text-center max-w-xs">{this.state.err}</p>
        <button onClick={() => { this.setState({ err: null }); window.location.href = '/' }}
          className="rounded-xl bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white">
          На главную
        </button>
      </div>
    )
    return this.props.children
  }
}

// Eagerly loaded (always needed at startup)
import { LoginPage } from '../pages/auth/LoginPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'

// Lazy-loaded — each becomes its own JS chunk, only downloaded when visited
const ResidentDashboard     = lazy(() => import('../pages/resident/ResidentDashboard').then(m => ({ default: m.ResidentDashboard })))
const MyAttendancePage      = lazy(() => import('../pages/resident/MyAttendancePage').then(m => ({ default: m.MyAttendancePage })))

const SupervisorHome           = lazy(() => import('../pages/supervisor/SupervisorHome').then(m => ({ default: m.SupervisorHome })))
const SessionHistoryPage       = lazy(() => import('../pages/supervisor/SessionHistoryPage').then(m => ({ default: m.SessionHistoryPage })))
const MarkAttendancePage       = lazy(() => import('../pages/supervisor/MarkAttendancePage').then(m => ({ default: m.MarkAttendancePage })))
const SupervisorResidentsPage  = lazy(() => import('../pages/supervisor/SupervisorResidentsPage').then(m => ({ default: m.SupervisorResidentsPage })))

const AdminDashboard        = lazy(() => import('../pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminManagePage       = lazy(() => import('../pages/admin/AdminManagePage').then(m => ({ default: m.AdminManagePage })))
const AspiriantsPage        = lazy(() => import('../pages/admin/AspiriantsPage').then(m => ({ default: m.AspiriantsPage })))
const StudentsAdminPage     = lazy(() => import('../pages/admin/StudentsAdminPage').then(m => ({ default: m.StudentsAdminPage })))
const StudentsPage          = lazy(() => import('../pages/supervisor/StudentsPage').then(m => ({ default: m.StudentsPage })))
const SupervisorLecturesPage = lazy(() => import('../pages/supervisor/SupervisorLecturesPage').then(m => ({ default: m.SupervisorLecturesPage })))

const LogbookPage       = lazy(() => import('../pages/resident/LogbookPage').then(m => ({ default: m.LogbookPage })))
const LogbookAddPage    = lazy(() => import('../pages/resident/LogbookAddPage').then(m => ({ default: m.LogbookAddPage })))
const LogbookEditPage   = lazy(() => import('../pages/resident/LogbookEditPage').then(m => ({ default: m.LogbookEditPage })))
const LogbookReviewPage = lazy(() => import('../pages/supervisor/LogbookReviewPage').then(m => ({ default: m.LogbookReviewPage })))
const LogbookAdminPage  = lazy(() => import('../pages/admin/LogbookAdminPage').then(m => ({ default: m.LogbookAdminPage })))

const SkillsPlaceholderPage = lazy(() => import('../pages/skills/SkillsPlaceholderPage').then(m => ({ default: m.SkillsPlaceholderPage })))
const DocumentsPage         = lazy(() => import('../pages/resident/DocumentsPage').then(m => ({ default: m.DocumentsPage })))
const AdminDocumentsPage    = lazy(() => import('../pages/admin/AdminDocumentsPage').then(m => ({ default: m.AdminDocumentsPage })))
const LectureRosterPage     = lazy(() => import('../pages/admin/LectureRosterPage').then(m => ({ default: m.LectureRosterPage })))
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
      <ErrorBoundary>
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
          <Route path="/resident/skills"        element={<R roles={['resident']}><SkillsPlaceholderPage /></R>} />
          <Route path="/resident/logbook"       element={<R roles={['resident']}><LogbookPage /></R>} />
          <Route path="/resident/logbook/add"   element={<R roles={['resident']}><LogbookAddPage /></R>} />
          <Route path="/resident/logbook/edit/:id" element={<R roles={['resident']}><LogbookEditPage /></R>} />
          <Route path="/resident/documents"  element={<R roles={['resident']}><DocumentsPage /></R>} />

          {/* Supervisor */}
          <Route path="/supervisor"                         element={<R roles={['supervisor']}><SupervisorHome /></R>} />
          <Route path="/supervisor/residents"              element={<R roles={['supervisor']}><SupervisorResidentsPage /></R>} />
          <Route path="/supervisor/sessions"               element={<R roles={['supervisor']}><SessionHistoryPage /></R>} />
          <Route path="/supervisor/session/:sessionId/mark" element={<R roles={['supervisor']}><MarkAttendancePage /></R>} />
          <Route path="/supervisor/calendar"               element={<R roles={['supervisor']}><CalendarPage /></R>} />
          <Route path="/supervisor/lectures"               element={<R roles={['supervisor']}><SupervisorLecturesPage /></R>} />
          <Route path="/supervisor/tasks"                  element={<R roles={['supervisor']}><TasksPage /></R>} />
          <Route path="/supervisor/students"               element={<R roles={['supervisor']}><StudentsPage /></R>} />
          <Route path="/supervisor/logs"                   element={<R roles={['supervisor']}><AssignmentLogPage /></R>} />
          <Route path="/supervisor/logbook"              element={<R roles={['supervisor']}><LogbookReviewPage /></R>} />

          {/* Admin */}
          <Route path="/admin"            element={<R roles={['admin']}><AdminDashboard /></R>} />
          <Route path="/admin/manage"     element={<R roles={['admin']}><AdminManagePage /></R>} />
          <Route path="/admin/calendar"   element={<Navigate to="/admin/lectures" replace />} />
          <Route path="/admin/tasks"      element={<R roles={['admin']}><TasksPage /></R>} />
          <Route path="/admin/aspirants"  element={<R roles={['admin']}><AspiriantsPage /></R>} />
          <Route path="/admin/students"   element={<R roles={['admin']}><StudentsAdminPage /></R>} />
          <Route path="/admin/logs"       element={<R roles={['admin']}><AssignmentLogPage /></R>} />
          <Route path="/admin/documents"  element={<R roles={['admin']}><AdminDocumentsPage /></R>} />
          <Route path="/admin/lectures"   element={<R roles={['admin']}><LectureRosterPage /></R>} />
          <Route path="/admin/logbook"    element={<R roles={['admin']}><LogbookAdminPage /></R>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
