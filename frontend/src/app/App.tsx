import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AppProvider } from './context/AppContext';
import { DataProvider } from './context/DataContext';
import { useAppSelector } from '../hooks/reduxHooks';
import { selectIsAuthenticated, selectCurrentUser } from '../features/auth/authSelectors';

// Auth Pages
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

// Onboarding
import { OnboardingPage } from './pages/OnboardingPage';

// Main Pages (Learner)
import { DashboardPage } from './pages/DashboardPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { LessonPage } from './pages/LessonPage';
import { QuizPage } from './pages/QuizPage';
import { CertificatePage } from './pages/CertificatePage';
import { PricingPage } from './pages/PricingPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

// Admin Pages
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage as AdminDashboardPage } from './pages/Dashboard';
import { LearnersPage } from './pages/Learners';
import { CoursesPage as AdminCoursesPage } from './pages/Courses';
import { CourseBuilderPage } from './pages/CourseBuilder';
import { AnalyticsPage } from './pages/Analytics';
import { SecurityPage } from './pages/Security';
import { SettingsPage as AdminSettingsPage } from './pages/Settings';

function AppRoutes() {
  const user = useAppSelector(selectCurrentUser);

  // Protected Route Component
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    
    return <>{children}</>;
  };

  // Admin Route Component
  const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const currentUser = useAppSelector(selectCurrentUser);
    
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (currentUser?.role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    
    return <>{children}</>;
  };

  // Public Route Component (redirect to dashboard if already authenticated)
  const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const userRole = useAppSelector(selectCurrentUser)?.role;
    
    if (isAuthenticated) {
      return <Navigate to={userRole === 'admin' ? '/admin' : '/dashboard'} replace />;
    }
    
    return <>{children}</>;
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/verify-email/:uid/:token"
          element={
            <PublicRoute>
              <VerifyEmailPage />
            </PublicRoute>
          }
        />

        <Route
          path="/reset-password/:uid/:token"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />

        {/* Learner Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {user?.role === 'admin' ? <Navigate to="/admin" replace /> : <DashboardPage />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <ProtectedRoute>
              {user?.role === 'admin' ? <Navigate to="/admin/courses" replace /> : <CoursesPage />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/course/:courseId"
          element={
            <ProtectedRoute>
              <CourseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lesson/:courseId/:lessonId"
          element={
            <ProtectedRoute>
              <LessonPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/:courseId/:lessonId"
          element={
            <ProtectedRoute>
              <QuizPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificate/:courseId"
          element={
            <ProtectedRoute>
              <CertificatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pricing"
          element={
            <ProtectedRoute>
              <PricingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              {user?.role === 'admin' ? <Navigate to="/admin/settings" replace /> : <SettingsPage />}
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <DashboardLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="learners" element={<LearnersPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="courses/builder/:id" element={<CourseBuilderPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default function App() {
  return (
    <AppProvider>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </AppProvider>
  );
}
