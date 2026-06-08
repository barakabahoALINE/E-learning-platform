import api from "../../services/api";
import type { BackendPermission, BackendRole, BackendUser } from "./types";

const rbacAPI = {
  fetchUsers: async (): Promise<BackendUser[]> => {
    const response = await api.get("auth/users/");
    return response.data.data || response.data;
  },

  fetchRoles: async (): Promise<BackendRole[]> => {
    const response = await api.get("auth/roles/");
    return response.data.data || response.data;
  },

  fetchPermissions: async (): Promise<BackendPermission[]> => {
    const response = await api.get("auth/permissions/");
    return response.data.data || response.data;
  },

  updateUser: async (id: number, data: Partial<BackendUser>): Promise<BackendUser> => {
    const response = await api.patch(`auth/users/${id}/update/`, data);
    return response.data.data || response.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`auth/users/${id}/delete/`);
  },

  assignUserGroups: async (userId: number, groups: string[]): Promise<BackendUser> => {
    const response = await api.patch(`auth/users/${userId}/groups-update/`, { groups });
    return response.data.data || response.data;
  },

  updateUserRole: async (userId: number, role: string): Promise<BackendUser> => {
    const response = await api.patch(`auth/users/${userId}/role-update/`, { role });
    return response.data.data || response.data;
  },

  createRole: async (name: string, permissions: string[], description = ""): Promise<BackendRole> => {
    const response = await api.post("auth/roles/create/", { name, description, permissions });
    return response.data.data || response.data;
  },

  createUser: async (data: {
    full_name: string;
    email: string;
    institution: string;
    department?: string;
    role: string;
  }): Promise<BackendUser> => {
    const response = await api.post("auth/add-user/", { ...data, status: "inactive" });
    return response.data.data || response.data;
  },

  updateRole: async (
    roleId: number,
    data: { name?: string; description?: string; permissions?: string[] },
  ): Promise<BackendRole> => {
    const response = await api.patch(`auth/roles/${roleId}/`, data);
    return response.data.data || response.data;
  },

  updateRolePermissions: async (roleId: number, permissions: string[]): Promise<BackendRole> => {
    const response = await api.patch(`auth/roles/${roleId}/permissions/`, { permissions });
    return response.data.data || response.data;
  },

  deleteRole: async (roleId: number): Promise<void> => {
    await api.delete(`auth/roles/${roleId}/delete/`);
  },
};

export default rbacAPI;
