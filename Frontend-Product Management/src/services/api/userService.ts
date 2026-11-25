import { api } from '../api';
import type { ApiResponse, PaginatedResponse, UserItem } from '@/types';

export interface CreateUserPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  roleId: string;
}

export interface UpdateUserPayload {
  name?: string;
  phone?: string | null;
  email?: string;
}

export const userService = {
  getUsers: (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.search) q.append('search', params.search);
    if (params?.isActive !== undefined) q.append('isActive', String(params.isActive));
    const query = q.toString() ? `?${q.toString()}` : '';
    return api.get<PaginatedResponse<UserItem>>(`/users${query}`);
  },

  getUserById: (id: string) => api.get<ApiResponse<UserItem>>(`/users/${id}`),

  createUser: (payload: CreateUserPayload) =>
    api.post<ApiResponse<UserItem>>('/users', payload),

  updateUser: (id: string, payload: UpdateUserPayload) =>
    api.patch<ApiResponse<UserItem>>(`/users/${id}`, payload),

  updateUserStatus: (id: string, isActive: boolean) =>
    api.patch<ApiResponse<UserItem>>(`/users/${id}/status`, { isActive }),

  updateUserRole: (id: string, roleId: string) =>
    api.patch<ApiResponse<UserItem>>(`/users/${id}/role`, { roleId }),
};
