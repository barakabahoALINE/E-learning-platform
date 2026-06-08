import type { RootState } from "../../app/store";

type RootStateWithRBAC = RootState & { rbac: any };

export const selectRBACUsers = (state: RootStateWithRBAC) => state.rbac.users;
export const selectRBACRoles = (state: RootStateWithRBAC) => state.rbac.roles;
export const selectRBACPermissions = (state: RootStateWithRBAC) => state.rbac.permissions;
export const selectRBACInstitutions = (state: RootStateWithRBAC) => state.rbac.institutions;
export const selectRBACAuditLogs = (state: RootStateWithRBAC) => state.rbac.auditLogs;
export const selectRBACLoading = (state: RootStateWithRBAC) => state.rbac.isLoading;
export const selectRBACError = (state: RootStateWithRBAC) => state.rbac.error;
export const selectRBACStatus = (state: RootStateWithRBAC) => state.rbac.status;
export const selectRBACLastFetched = (state: RootStateWithRBAC) => state.rbac.lastFetched;
