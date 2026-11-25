export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  message: string;
  success: boolean;
  total: number;
  page: number;
  limit: number;
}

export interface Shop {
  id: string;
  name: string;
  shopType: 'grocery' | 'clothing' | 'pharmacy' | 'electronics' | 'hardware' | 'stationery' | 'general' | string;
  gstin?: string | null;
  currency: string;
  createdAt: string;
}

export interface UserItem {
  id: string;
  shopId: string;
  name: string;
  email: string;
  phone?: string | null;
  roleId: string;
  role: string;
  isSystemRole?: boolean;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
}

export interface RoleItem {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: string;
  permissions: string[];
}

export interface PermissionItem {
  id: string;
  code: string;
  module: string;
  description: string;
}

export interface EmployeeItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  designation?: string | null;
  joiningDate?: string | null;
  salary?: number | null;
  address?: string | null;
  emergencyContact?: string | null;
  role: string;
  roleId: string;
}

export interface ShopModuleItem {
  moduleName: 'employee' | 'inventory' | 'billing' | string;
  isEnabled: boolean;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  createdAt: string;
  userName?: string | null;
  userEmail?: string | null;
}
