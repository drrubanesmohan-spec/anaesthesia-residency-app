import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { Spinner } from '../components/ui/Spinner'

import { LoginPage } from '../pages/auth/LoginPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'

import { ResidentDashboard } from '../pages/resident/ResidentDashboard'
import { MyAttendancePage } from '../pages/resident/MyAttendancePage'

import { SupervisorHome } from '../pages/supervisor/SupervisorHome'
import { MarkAttendancePage } from '../pages/supervisor/MarkAttendancePage'
import { SessionHistoryPage } from '../pages/supervisor/SessionHistoryPage'

import { AdminDashboard } from '../pages/admin/AdminDashboard'
import { AdminManagePage } from '../pages/admin/AdminManagePage'
import { AttendanceReportsPage } from '../pages/admin/AttendanceReportsPage'

import { SkillsPlaceholderPage } from '../pages/skills/SkillsPlaceholderPage'
import { AssignmentLogPage } from '../pages/shared/AssignmentLogPage'
import { CalendarPage } from '../pages/shared/CalendarPage'

function RoleRedirect() {
  const { appUser, loading, session } = useAuth()

  if (loading || (session && !appUser)) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  if (!appUser) return <Navigate to="/login" replace />
  if (appUser.role === 'admin') return <Navigate to="/admin" replace />
  if (appUser.role === 'supervisor') return <Navigate to="/supervisor" replace />
  return <Navigate to="/resident" replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Root redirect */}
        <Route path="/" element={<RoleRedirect />} />

        {/* Resident */}
        <Route path="/resident" element={<ProtectedRoute allowedRoles={['resident']}><ResidentDashboard /></ProtectedRoute>} />
        <Route path="/resident/attendance" element={<ProtectedRoute allowedRoles={['resident']}><MyAttendancePage /></ProtectedRoute>} />
        <Route path="/resident/calendar" element={<ProtectedRoute allowedRoles={['resident']}><CalendarPage /></ProtectedRoute>} />
        <Route path="/resident/skills" element={<ProtectedRoute allowedRoles={['resident']}><SkillsPlaceholderPage /></ProtectedRoute>} />

        {/* Supervisor */}
        <Route path="/supervisor" element={<ProtectedRoute allowedRoles={['supervisor']}><SupervisorHome /></ProtectedRoute>} />
        <Route path="/supervisor/sessions" element={<ProtectedRoute allowedRoles={['supervisor']}><SessionHistoryPage /></ProtectedRoute>} />
        <Route path="/supervisor/session/:sessionId/mark" element={<ProtectedRoute allowedRoles={['supervisor']}><MarkAttendancePage /></ProtectedRoute>} />
        <Route path="/supervisor/calendar" element={<ProtectedRoute allowedRoles={['supervisor']}><CalendarPage /></ProtectedRoute>} />
        <Route path="/supervisor/skills" element={<ProtectedRoute allowedRoles={['supervisor']}><SkillsPlaceholderPage /></ProtectedRoute>} />
        <Route path="/supervisor/logs" element={<ProtectedRoute allowedRoles={['supervisor']}><AssignmentLogPage /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/manage" element={<ProtectedRoute allowedRoles={['admin']}><AdminManagePage /></ProtectedRoute>} />
        <Route path="/admin/calendar" element={<ProtectedRoute allowedRoles={['admin']}><CalendarPage /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AttendanceReportsPage /></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute allowedRoles={['admin']}><AssignmentLogPage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
