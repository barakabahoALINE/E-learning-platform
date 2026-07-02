import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import rbacAPI from "./rbacAPI";
import type {
  BackendPermission,
  BackendRole,
  BackendUser,
  CreateUserPayload,
  Institution,
  RBACAuditLog,
  RBACPermission,
  RBACRole,
  RBACUser,
  UpdateRolePayload,
  UpdateUserPayload,
} from "./types";

const SYSTEM_ROLES = new Set(["SuperAdmin", "Admin", "Instructor", "Student", "Viewer"]);

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Admin: "Platform manager with broad administrative access.",
  Instructor: "Course delivery and assessment management access.",
  Student: "Authenticated learning user with enrollment and progress access.",
  Learner: "Registered user who can browse and enroll in courses.",
  Viewer: "Read-only platform access.",
};

interface RBACState {
  users: RBACUser[];
  roles: RBACRole[];
  permissions: RBACPermission[];
  institutions: Institution[];
  auditLogs: RBACAuditLog[];
  isLoading: boolean;
  error: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  lastFetched: number | null;
}

const initials = (name: string, email: string) => {
  const source = name.trim() || email;
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const roleToBackendRole = (roleName: string) => roleName.toLowerCase().replace(/\s+/g, "_");

const formatDate = (value?: string | null) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().split("T")[0];
};

const normalizeUser = (user: BackendUser, previous?: RBACUser): RBACUser => {
  const roles = user.groups?.length
    ? user.groups
    : user.role
      ? [user.role.charAt(0).toUpperCase() + user.role.slice(1)]
      : [];
  const name = user.full_name || user.email;

  return {
    id: user.id,
    name,
    email: user.email,
    avatar: initials(name, user.email),
    institution: user.institution || "Not specified",
    department: user.department || previous?.department || "",
    roles,
    role: user.role,
    status: user.status || (user.is_active === false || user.is_verified === false ? "inactive" : "active"),
    lastLogin: user.last_login ? new Date(user.last_login).toLocaleString() : "Not available",
    createdAt: formatDate(user.date_joined),
    recentActivity: previous?.recentActivity || [],
    permissions: user.permissions || [],
    isSuperuser: Boolean(user.is_superuser),
    roleHistory: previous?.roleHistory,
    activationHistory: previous?.activationHistory,
  };
};

const normalizePermission = (permission: BackendPermission): RBACPermission => {
  const [module, codename] = permission.permission.split(".");
  return {
    id: permission.permission,
    backendId: permission.id,
    name: permission.name,
    description: permission.name,
    module: module || "system",
    codename: codename || permission.codename,
  };
};

const normalizeRole = (role: BackendRole, users: RBACUser[], previous?: RBACRole): RBACRole => ({
  id: role.id,
  name: role.name,
  description: role.description || previous?.description || ROLE_DESCRIPTIONS[role.name] || "Custom role managed by Django Groups.",
  permissions: role.permissions || [],
  userCount: users.filter((user) => user.roles.includes(role.name)).length,
  lastModified: role.last_modified ? formatDate(role.last_modified) : previous?.lastModified || "Synced",
  isSystemRole: SYSTEM_ROLES.has(role.name),
});

const loadAuditLogs = (): RBACAuditLog[] => {
  try {
    return JSON.parse(localStorage.getItem("rbac_auditLogs") || "[]");
  } catch {
    return [];
  }
};

const persistAuditLogs = (logs: RBACAuditLog[]) => {
  localStorage.setItem("rbac_auditLogs", JSON.stringify(logs));
};

const makeAuditLog = (
  action: string,
  target: string,
  details: string,
  module = "Access Management",
  severity: RBACAuditLog["severity"] = "info",
): RBACAuditLog => ({
  id: Date.now(),
  timestamp: new Date().toISOString(),
  actor: "Current Admin",
  action,
  target,
  details,
  ipAddress: "Client",
  status: severity === "critical" ? "critical" : severity === "warning" ? "warning" : "success",
  severity,
  module,
});

const deriveInstitutions = (users: RBACUser[], existing: Institution[] = []): Institution[] => {
  const existingByName = new Map(existing.map((institution) => [institution.name, institution]));
  const names = [...new Set(users.map((user) => user.institution).filter(Boolean))];
  return names.map((name, index) => {
    const existingInstitution = existingByName.get(name);
    return {
      id: existingInstitution?.id || index + 1,
      name,
      domain: existingInstitution?.domain || "",
      status: existingInstitution?.status || "active",
      createdAt: existingInstitution?.createdAt || "Synced",
      userCount: users.filter((user) => user.institution === name).length,
    };
  });
};

const initialState: RBACState = {
  users: [],
  roles: [],
  permissions: [],
  institutions: [],
  auditLogs: loadAuditLogs(),
  isLoading: false,
  error: null,
  status: "idle",
  lastFetched: null,
};

const errorMessage = (error: unknown) => {
  const err = error as any;
  return err?.response?.data?.detail || err?.response?.data?.message || err?.message || "RBAC request failed";
};

export const fetchRBACData = createAsyncThunk(
  "rbac/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const [usersResult, rolesResult, permissionsResult] = await Promise.allSettled([
        rbacAPI.fetchUsers(),
        rbacAPI.fetchRoles(),
        rbacAPI.fetchPermissions(),
      ]);

      if (
        usersResult.status === "rejected" &&
        rolesResult.status === "rejected" &&
        permissionsResult.status === "rejected"
      ) {
        throw usersResult.reason;
      }

      const backendUsers = usersResult.status === "fulfilled" ? usersResult.value : [];
      const backendRoles = rolesResult.status === "fulfilled" ? rolesResult.value : [];
      const backendPermissions = permissionsResult.status === "fulfilled" ? permissionsResult.value : [];

      return { backendUsers, backendRoles, backendPermissions };
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
);

export const createRBACUser = createAsyncThunk(
  "rbac/createUser",
  async (payload: CreateUserPayload, { dispatch, rejectWithValue }) => {
    try {
      await rbacAPI.createUser({
        full_name: payload.name,
        email: payload.email,
        institution: payload.institution,
        department: payload.department,
        role: roleToBackendRole(payload.role),
      });
      await dispatch(fetchRBACData());
      return payload;
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
);

export const updateRBACUser = createAsyncThunk(
  "rbac/updateUser",
  async ({ id, updates }: UpdateUserPayload, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { rbac: RBACState };
      const existing = state.rbac.users.find((user) => user.id === id);
      const response = await rbacAPI.updateUser(id, {
        full_name: updates.name,
        institution: updates.institution,
        role: updates.role,
        is_active: updates.status ? updates.status === "active" : undefined,
      });
      return normalizeUser(response, existing);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
);

export const deleteRBACUser = createAsyncThunk(
  "rbac/deleteUser",
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { rbac: RBACState };
      const user = state.rbac.users.find((item) => item.id === id);
      await rbacAPI.deleteUser(id);
      return { id, user };
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
);

export const assignRBACRole = createAsyncThunk(
  "rbac/assignRole",
  async ({ userId, roleName }: { userId: number; roleName: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { rbac: RBACState };
      const existing = state.rbac.users.find((user) => user.id === userId);
      const groups = [...new Set([...(existing?.roles || []), roleName])];
      // First update groups on backend, then fetch the latest user object
      await rbacAPI.assignUserGroups(userId, groups);
      await rbacAPI.updateUserRole(userId, roleToBackendRole(roleName)).catch(() => undefined);
      const refreshed = await rbacAPI.fetchUsers();
      const updatedUser = refreshed.find((u) => u.id === userId) as BackendUser | undefined;
      if (!updatedUser) throw new Error("Failed to retrieve updated user after role assignment");
      return normalizeUser(updatedUser, existing);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
);

export const removeRBACRole = createAsyncThunk(
  "rbac/removeRole",
  async ({ userId, roleName }: { userId: number; roleName: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { rbac: RBACState };
      const existing = state.rbac.users.find((user) => user.id === userId);
      const groups = (existing?.roles || []).filter((role) => role !== roleName);
      await rbacAPI.assignUserGroups(userId, groups);
      const refreshed = await rbacAPI.fetchUsers();
      const updatedUser = refreshed.find((u) => u.id === userId) as BackendUser | undefined;
      if (!updatedUser) throw new Error("Failed to retrieve updated user after role removal");
      return normalizeUser(updatedUser, existing);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
);

export const createRBACRole = createAsyncThunk(
  "rbac/createRole",
  async ({ name, description, permissions }: { name: string; description?: string; permissions: string[] }, { rejectWithValue }) => {
    try {
      return await rbacAPI.createRole(name, permissions, description);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
);

export const updateRBACRolePermissions = createAsyncThunk(
  "rbac/updateRolePermissions",
  async ({ roleId, permissions }: { roleId: number; permissions: string[] }, { rejectWithValue }) => {
    try {
      return await rbacAPI.updateRolePermissions(roleId, permissions);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
);

export const updateRBACRole = createAsyncThunk(
  "rbac/updateRole",
  async ({ id, updates }: UpdateRolePayload, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { rbac: RBACState };
      const role = state.rbac.roles.find((item) => item.id === id);
      const response = await rbacAPI.updateRole(id, {
        name: updates.name,
        description: updates.description,
        permissions: updates.permissions || role?.permissions,
      });
      return normalizeRole(response, state.rbac.users, role);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
);

export const deleteRBACRole = createAsyncThunk(
  "rbac/deleteRole",
  async (id: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { rbac: RBACState };
      const role = state.rbac.roles.find((item) => item.id === id);
      await rbacAPI.deleteRole(id);
      return { id, role };
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
);

const rbacSlice = createSlice({
  name: "rbac",
  initialState,
  reducers: {
    addInstitution: (state, action: PayloadAction<Omit<Institution, "id" | "createdAt" | "userCount">>) => {
      const institution = {
        ...action.payload,
        id: Math.max(0, ...state.institutions.map((item) => item.id)) + 1,
        createdAt: new Date().toISOString().split("T")[0],
        userCount: 0,
      };
      state.institutions.push(institution);
    },
    clearRBACError: (state) => {
      state.error = null;
    },
    resetRBACState: (state) => {
      state.users = [];
      state.roles = [];
      state.permissions = [];
      state.institutions = [];
      state.auditLogs = [];
      state.isLoading = false;
      state.error = null;
      state.status = "idle";
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase("auth/logout/fulfilled", (state) => {
        state.users = [];
        state.roles = [];
        state.permissions = [];
        state.institutions = [];
        state.auditLogs = [];
        state.isLoading = false;
        state.error = null;
        state.status = "idle";
        state.lastFetched = null;
      })
      .addCase("auth/logout/rejected", (state) => {
        state.users = [];
        state.roles = [];
        state.permissions = [];
        state.institutions = [];
        state.auditLogs = [];
        state.isLoading = false;
        state.error = null;
        state.status = "idle";
        state.lastFetched = null;
      })
      .addCase("auth/login/fulfilled", (state) => {
        state.users = [];
        state.roles = [];
        state.permissions = [];
        state.institutions = [];
        state.auditLogs = [];
        state.isLoading = false;
        state.error = null;
        state.status = "idle";
        state.lastFetched = null;
      })
      .addCase("auth/googleLogin/fulfilled", (state) => {
        state.users = [];
        state.roles = [];
        state.permissions = [];
        state.institutions = [];
        state.auditLogs = [];
        state.isLoading = false;
        state.error = null;
        state.status = "idle";
        state.lastFetched = null;
      })
      .addCase(fetchRBACData.pending, (state) => {
        state.isLoading = true;
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchRBACData.fulfilled, (state, action) => {
        const users = action.payload.backendUsers.map((user) =>
          normalizeUser(user, state.users.find((item) => item.id === user.id)),
        );
        state.users = users;
        state.permissions = action.payload.backendPermissions.map(normalizePermission);
        state.roles = action.payload.backendRoles.map((role) =>
          normalizeRole(role, users, state.roles.find((item) => item.id === role.id)),
        );
        state.institutions = deriveInstitutions(users, state.institutions);
        state.isLoading = false;
        state.status = "succeeded";
        state.lastFetched = Date.now();
      })
      .addCase(fetchRBACData.rejected, (state, action) => {
        state.isLoading = false;
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(createRBACUser.fulfilled, (state, action) => {
        state.auditLogs.unshift(makeAuditLog("Created user", action.payload.email, "Created user", "Users"));
        persistAuditLogs(state.auditLogs);
      })
      .addCase(updateRBACUser.fulfilled, (state, action) => {
        const index = state.users.findIndex((user) => user.id === action.payload.id);
        if (index !== -1) state.users[index] = action.payload;
        state.institutions = deriveInstitutions(state.users, state.institutions);
        state.auditLogs.unshift(makeAuditLog("Updated user", action.payload.name, "Updated user account details", "Users"));
        persistAuditLogs(state.auditLogs);
      })
      .addCase(deleteRBACUser.fulfilled, (state, action) => {
        state.users = state.users.filter((user) => user.id !== action.payload.id);
        state.roles = state.roles.map((role) => normalizeRole(role, state.users, role));
        state.auditLogs.unshift(makeAuditLog("Deleted user", action.payload.user?.name || String(action.payload.id), "Deleted user account", "Users", "critical"));
        persistAuditLogs(state.auditLogs);
      })
      .addCase(assignRBACRole.fulfilled, (state, action) => {
        const index = state.users.findIndex((user) => user.id === action.payload.id);
        if (index !== -1) state.users[index] = action.payload;
        state.roles = state.roles.map((role) => normalizeRole(role, state.users, role));
        state.auditLogs.unshift(makeAuditLog("Assigned role", action.payload.name, `Current roles: ${action.payload.roles.join(", ")}`, "Users"));
        persistAuditLogs(state.auditLogs);
      })
      .addCase(removeRBACRole.fulfilled, (state, action) => {
        const index = state.users.findIndex((user) => user.id === action.payload.id);
        if (index !== -1) state.users[index] = action.payload;
        state.roles = state.roles.map((role) => normalizeRole(role, state.users, role));
        state.auditLogs.unshift(makeAuditLog("Removed role", action.payload.name, `Current roles: ${action.payload.roles.join(", ")}`, "Users", "warning"));
        persistAuditLogs(state.auditLogs);
      })
      .addCase(createRBACRole.fulfilled, (state, action) => {
        const role = normalizeRole(action.payload, state.users);
        state.roles.push(role);
        state.auditLogs.unshift(makeAuditLog("Created role", role.name, `Created role with ${role.permissions.length} permissions`, "Roles"));
        persistAuditLogs(state.auditLogs);
      })
      .addCase(updateRBACRole.fulfilled, (state, action) => {
        const index = state.roles.findIndex((role) => role.id === action.payload.id);
        if (index !== -1) state.roles[index] = action.payload;
      })
      .addCase(updateRBACRolePermissions.fulfilled, (state, action) => {
        const role = normalizeRole(action.payload, state.users, state.roles.find((item) => item.id === action.payload.id));
        const index = state.roles.findIndex((item) => item.id === role.id);
        if (index !== -1) state.roles[index] = role;
        state.auditLogs.unshift(makeAuditLog("Updated role permissions", role.name, `Modified permissions (${role.permissions.length} total)`, "Roles"));
        persistAuditLogs(state.auditLogs);
      })
      .addCase(deleteRBACRole.fulfilled, (state, action) => {
        state.roles = state.roles.filter((role) => role.id !== action.payload.id);
        state.auditLogs.unshift(makeAuditLog("Deleted role", action.payload.role?.name || String(action.payload.id), "Deleted role", "Roles", "critical"));
        persistAuditLogs(state.auditLogs);
      })
      .addMatcher(
        (action) => action.type.startsWith("rbac/") && action.type.endsWith("/rejected") && action.type !== fetchRBACData.rejected.type,
        (state, action: PayloadAction<string>) => {
          state.error = action.payload;
        },
      );
  },
});

export const { addInstitution, clearRBACError, resetRBACState } = rbacSlice.actions;
export default rbacSlice.reducer;
