import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AppProvider } from './context/AppContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from 'next-themes';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAppSelector } from '../hooks/reduxHooks';
import { selectIsAuthenticated, selectCurrentUser } from '../features/auth/authSelectors';
import { hasAnyPermission } from '../features/auth/permissions';
import { PermissionRoute } from './components/auth/PermissionRoute';
import { RoleBasedRedirect } from './components/auth/RoleBasedRedirect';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { LessonPage } from './pages/LessonPage';
import { QuizPage } from './pages/QuizPage';
import { FinalAssessmentPage } from './pages/FinalAssessmentPage';
import { CertificatePage } from './pages/CertificatePage';
import { PricingPage } from './pages/PricingPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage as AdminDashboardPage } from './pages/Dashboard';
import { LearnersPage } from './pages/Learners';
import { CoursesPage as AdminCoursesPage } from './pages/Courses';
import { CourseBuilderPage } from './pages/CourseBuilder';
import { AnalyticsPage } from './pages/Analytics';
import { SecurityPage } from './pages/Security';
import { SettingsPage as AdminSettingsPage } from './pages/Settings';
import { HomePage } from './pages/HomePage';
import { RBACDashboardPage } from './pages/RBACDashboard';
import { UsersManagementPage } from './pages/UsersManagement';
import { RoleManagementPage } from './pages/RoleManagement';
import { PermissionManagementPage } from './pages/PermissionManagement';
import { AuditLogsPage } from './pages/AuditLogs';
import { CourseFeedbackPage } from './pages/CourseFeedbackPage';
import { MyLearningPage } from './pages/MyLearningPage';
import { InstructorCourseStudents } from './pages/InstructorCourseStudents';

// Permissions that grant access to the shared admin/instructor portal
const ADMIN_ACCESS_PERMISSIONS = [
  "users_app.view_user",
  "courses_app.add_course",
  "users_app.view_analytics",
  "auth.view_group",
  "auth.view_permission",
  "users_app.change_platform_settings",
];

const AdminIndexPage: React.FC = () => <AdminDashboardPage />;

function AppRoutes() {
  const user = useAppSelector(selectCurrentUser);
  const canAccessAdmin = hasAnyPermission(user, ADMIN_ACCESS_PERMISSIONS);

  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
  };

  // Guards the shared portal (/admin). All roles that have any admin-level permission enter here.
  const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const currentUser = useAppSelector(selectCurrentUser);
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!hasAnyPermission(currentUser, ADMIN_ACCESS_PERMISSIONS)) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  };

  // Redirects already-authenticated users away from public pages to their portal.
  const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    if (isAuthenticated) return <RoleBasedRedirect />;
    return <>{children}</>;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Public (auth) routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/verify-email/:uid/:token" element={<PublicRoute><VerifyEmailPage /></PublicRoute>} />
        <Route path="/reset-password/:uid/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

        {/* Onboarding */}
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

        {/* Learner routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {canAccessAdmin ? <Navigate to="/admin" replace /> : <DashboardPage />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <ProtectedRoute>
              {canAccessAdmin ? <Navigate to="/admin/courses" replace /> : <CoursesPage />}
            </ProtectedRoute>
          }
        />
        <Route path="/course/:courseId" element={<ProtectedRoute><CourseDetailPage /></ProtectedRoute>} />
        <Route path="/learning/:courseId/:moduleId" element={<ProtectedRoute><LessonPage /></ProtectedRoute>} />
        <Route path="/learning/:courseId/quiz/:moduleId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
        <Route path="/learning/:courseId/final-assessment" element={<ProtectedRoute><FinalAssessmentPage /></ProtectedRoute>} />
        <Route path="/certificate/:courseId" element={<ProtectedRoute><CertificatePage /></ProtectedRoute>} />
        <Route path="/course-feedback/:courseId" element={<ProtectedRoute><CourseFeedbackPage /></ProtectedRoute>} />
        <Route path="/my-learning" element={<ProtectedRoute><MyLearningPage /></ProtectedRoute>} />
        <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              {canAccessAdmin ? <Navigate to="/admin/settings" replace /> : <SettingsPage />}
            </ProtectedRoute>
          }
        />

        {/* Shared portal for SuperAdmin, Admin, Viewer, and Instructor. Menu items and features are gated by the user's role/permissions inside the layout. */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <DashboardLayout />
            </AdminRoute>
          }
        >
          {/* Role-aware dashboard index */}
          <Route index element={<AdminIndexPage />} />

          {/* Learner management */}
          <Route
            path="learners"
            element={<PermissionRoute permission="users_app.view_user"><LearnersPage /></PermissionRoute>}
          />

          {/* Course management */}
          <Route
            path="courses"
            element={<PermissionRoute permission="courses_app.view_course"><AdminCoursesPage /></PermissionRoute>}
          />
          <Route
            path="courses/builder/:id"
            element={<PermissionRoute permission="courses_app.change_course"><CourseBuilderPage /></PermissionRoute>}
          />

          {/* Analytics */}
          <Route
            path="analytics"
            element={<PermissionRoute permission="users_app.view_analytics"><AnalyticsPage /></PermissionRoute>}
          />

          {/* Security */}
          <Route
            path="security"
            element={<PermissionRoute permission="users_app.view_user"><SecurityPage /></PermissionRoute>}
          />

          {/* Platform settings */}
          <Route
            path="settings"
            element={<PermissionRoute permission="users_app.change_platform_settings"><AdminSettingsPage /></PermissionRoute>}
          />

          {/* Access control — restricted to Admin and SuperAdmin */}
          <Route
            path="rbac"
            element={<PermissionRoute permission="users_app.modify_permission"><RBACDashboardPage /></PermissionRoute>}
          />
          <Route
            path="rbac/users"
            element={<PermissionRoute permission="users_app.view_user"><UsersManagementPage /></PermissionRoute>}
          />
          <Route
            path="rbac/roles"
            element={<PermissionRoute permission="auth.view_group"><RoleManagementPage /></PermissionRoute>}
          />
          <Route
            path="rbac/permissions"
            element={<PermissionRoute permission="auth.view_permission"><PermissionManagementPage /></PermissionRoute>}
          />
          <Route
            path="rbac/audit-logs"
            element={<PermissionRoute permission="users_app.view_user"><AuditLogsPage /></PermissionRoute>}
          />

          {/* Instructor-specific routes (mounted under /admin so they share DashboardLayout) */}
          <Route
            path="instructor/course/:courseId/students"
            element={<PermissionRoute permission="enrollments_app.view_enrollment"><InstructorCourseStudents /></PermissionRoute>}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default function App() {
  const googleClientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "979040117820-9qgcmv76nbqpa250ioal8qf3mj54un9t.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        storageKey="learnhub-theme"
        disableTransitionOnChange={false}
      >
        <AppProvider>
          <DataProvider>
            <AppRoutes />
          </DataProvider>
        </AppProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
