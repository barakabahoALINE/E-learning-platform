import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../../hooks/reduxHooks";
import { selectCurrentUser, selectIsAuthenticated } from "../../../features/auth/authSelectors";
import { hasPermission, hasAnyPermission } from "../../../features/auth/permissions";

type PermissionRouteProps = {
  permission: string;
  children: ReactNode;
};

const PORTAL_PERMISSIONS = [
  "users_app.view_user",
  "courses_app.add_course",
  "users_app.view_analytics",
  "users_app.change_platform_settings",
];

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(user, permission)) {
    const isPortalUser = user?.is_superuser || hasAnyPermission(user, PORTAL_PERMISSIONS);
    return <Navigate to={isPortalUser ? "/admin" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}
