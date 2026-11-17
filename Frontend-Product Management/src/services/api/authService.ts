import { api } from '../api';
import type { ApiResponse } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
  shopId?: string;
}

export interface RegisterPayload {
  shopName: string;
  shopType?: string;
  currency?: string;
  gstin?: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  shopId: string;
  roleId: string;
  shopName?: string;
  shopType?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  shop?: {
    id: string;
    name: string;
    shopType?: string;
    currency?: string;
  };
}

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', payload),

  forgotPassword: (email: string, shopId?: string) =>
    api.post<ApiResponse<{ message: string; resetToken?: string }>>('/auth/password/forgot', { email, shopId }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/password/reset', { token, newPassword }),

  logout: () =>
    api.post<ApiResponse<{ message: string }>>('/auth/logout', {}),

  getMe: () =>
    api.get<ApiResponse<AuthUser>>('/auth/me'),
};
