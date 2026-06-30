export type UserStatus = "active" | "inactive";

export interface BackendUser {
  id: number;
  email: string;
  full_name: string;
  institution: string;
  department?: string;
  role?: string;
  status?: UserStatus;
  is_verified?: boolean;
  is_active?: boolean;
  is_superuser?: boolean;
  groups?: string[];
  permissions?: string[];
  date_joined?: string;
  last_login?: string | null;
}

export interface BackendRole {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  last_modified?: string | null;
}

export interface BackendPermission {
  id: number;
  name: string;
  codename: string;
  permission: string;
}

export interface RBACUser {
  id: number;
  name: string;
  email: string;
  avatar: string;
  institution: string;
  department?: string;
  roles: string[];
  role?: string;
  status: UserStatus;
  lastLogin: string;
  createdAt: string;
  recentActivity: string[];
  permissions: string[];
  isSuperuser: boolean;
  roleHistory?: { role: string; action: "assigned" | "removed"; date: string; by: string }[];
  activationHistory?: { action: "activated" | "deactivated"; date: string; by: string }[];
}

export interface RBACRole {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  lastModified: string;
  isSystemRole: boolean;
}

export interface RBACPermission {
  id: string;
  backendId: number;
  name: string;
  description: string;
  module: string;
  codename: string;
}

export interface RBACAuditLog {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  details: string;
  ipAddress: string;
  status: "success" | "warning" | "critical";
  severity: "info" | "warning" | "critical";
  module?: string;
  metadata?: Record<string, string>;
}

export interface Institution {
  id: number;
  name: string;
  domain: string;
  status: "active" | "disabled";
  createdAt: string;
  userCount: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  institution: string;
  department?: string;
  role: string;
}

export interface UpdateUserPayload {
  id: number;
  updates: Partial<RBACUser>;
}

export interface UpdateRolePayload {
  id: number;
  updates: Partial<RBACRole>;
}
