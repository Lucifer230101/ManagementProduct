import { api } from '../api';
import type { ApiResponse, RoleItem, PermissionItem } from '@/types';

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string | null;
}

export const roleService = {
  getRoles: () => api.get<ApiResponse<RoleItem[]>>('/roles'),

  getRoleById: (id: string) => api.get<ApiResponse<RoleItem>>(`/roles/${id}`),

  createRole: (payload: CreateRolePayload) =>
    api.post<ApiResponse<RoleItem>>('/roles', payload),

  updateRole: (id: string, payload: UpdateRolePayload) =>
    api.patch<ApiResponse<RoleItem>>(`/roles/${id}`, payload),

  deleteRole: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/roles/${id}`),

  updateRolePermissions: (id: string, permissions: string[]) =>
    api.put<ApiResponse<RoleItem>>(`/roles/${id}/permissions`, { permissions }),

  getPermissions: () => api.get<ApiResponse<PermissionItem[]>>('/permissions'),
};
