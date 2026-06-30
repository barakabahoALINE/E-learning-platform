import type { User } from "./types";

export const ADMIN_FALLBACK_PERMISSIONS = [
  "users_app.view_user",
  "users_app.add_user",
  "users_app.change_user",
  "users_app.delete_user",
  "users_app.change_platform_settings",
  "users_app.assign_role",
  "users_app.modify_role",
  "users_app.modify_permission",
  "users_app.view_analytics",
  "auth.view_group",
  "auth.view_permission",
  "auth.change_group",
  "courses_app.view_course",
  "courses_app.add_course",
  "courses_app.change_course",
  "courses_app.delete_course",
  "courses_app.publish_course",
  "enrollments_app.view_enrollment",
  "enrollments_app.add_enrollment",
  "enrollments_app.change_enrollment",
  "enrollments_app.delete_enrollment",
  "assessments_app.view_assessment",
  "assessments_app.add_assessment",
  "assessments_app.change_assessment",
  "assessments_app.delete_assessment",
  "assessments_app.grade_assessment",
  "progress_app.view_progress",
] as const;

export const VIEWER_FALLBACK_PERMISSIONS = [
  "users_app.view_user",
  "users_app.view_analytics",
  "users_app.change_platform_settings",
  "courses_app.view_course",
  "courses_app.view_published_course",
  "enrollments_app.view_enrollment",
  "assessments_app.view_assessment",
  "assessments_app.view_attempt",
  "progress_app.view_progress",
] as const;

export const INSTRUCTOR_FALLBACK_PERMISSIONS = [
  "users_app.view_user",
  "users_app.view_analytics",
  "users_app.change_platform_settings",
  "courses_app.view_course",
  "courses_app.add_course",
  "courses_app.change_course",
  "courses_app.delete_course",
  "courses_app.publish_course",
  "enrollments_app.view_enrollment",
  "assessments_app.view_assessment",
  "assessments_app.add_assessment",
  "assessments_app.change_assessment",
  "assessments_app.grade_assessment",
  "progress_app.view_progress",
] as const;

export function getEffectivePermissions(user: User | null): string[] {
  if (!user) return [];
  if (user.is_superuser) return ["*"];

  let permissions = [...(user.permissions || [])];

  if (user.role === "admin" || user.groups?.includes("Admin")) {
    permissions = [...permissions, ...ADMIN_FALLBACK_PERMISSIONS];
  } else if (user.role === "viewer" || user.groups?.includes("Viewer")) {
    permissions = [...permissions, ...VIEWER_FALLBACK_PERMISSIONS];
  } else if (user.role === "instructor" || user.groups?.includes("Instructor")) {
    permissions = [...permissions, ...INSTRUCTOR_FALLBACK_PERMISSIONS];
  }

  return Array.from(new Set(permissions));
}

export function hasPermission(user: User | null, permission: string): boolean {
  const permissions = getEffectivePermissions(user);
  return permissions.includes("*") || permissions.includes(permission);
}

export function hasAnyPermission(user: User | null, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(user: User | null, permissions: string[]): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

export function hasAdminManagementAccess(user: User | null): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;
  return user.role === "admin" || user.groups?.includes("Admin") || false;
}
