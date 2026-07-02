import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../../hooks/reduxHooks';
import { selectCurrentUser } from '../../../features/auth/authSelectors';
import { hasAnyPermission } from '../../../features/auth/permissions';

const PORTAL_ACCESS_PERMISSIONS = [
  "users_app.view_user",
  "users_app.view_analytics",
  "users_app.change_platform_settings",
  "courses_app.add_course",
  "courses_app.change_course",
];

export const RoleBasedRedirect: React.FC = () => {
  const user = useAppSelector(selectCurrentUser);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.is_superuser || hasAnyPermission(user, PORTAL_ACCESS_PERMISSIONS)) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};
