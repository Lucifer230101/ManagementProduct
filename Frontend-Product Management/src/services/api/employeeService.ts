import { api } from '../api';
import type { ApiResponse, EmployeeItem } from '@/types';

export interface CreateEmployeePayload {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  roleId?: string;
  designation?: string;
  joiningDate?: string;
  salary?: number | null;
  address?: string;
  emergencyContact?: string;
}

export interface UpdateEmployeePayload {
  designation?: string | null;
  joiningDate?: string | null;
  salary?: number | null;
  address?: string | null;
  emergencyContact?: string | null;
}

export const employeeService = {
  getEmployees: () => api.get<ApiResponse<EmployeeItem[]>>('/employees'),

  getEmployeeById: (userId: string) =>
    api.get<ApiResponse<EmployeeItem>>(`/employees/${userId}`),

  createEmployee: (payload: CreateEmployeePayload) =>
    api.post<ApiResponse<EmployeeItem>>('/employees', payload),

  updateEmployee: (userId: string, payload: UpdateEmployeePayload) =>
    api.patch<ApiResponse<EmployeeItem>>(`/employees/${userId}`, payload),

  deleteEmployee: (userId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/employees/${userId}`),
};
