import { api } from './api';
import type { Product, PaginatedResponse, ApiResponse } from '@/types';

export const productService = {
  getAll: (page = 1, limit = 10) =>
    api.get<PaginatedResponse<Product>>(/products?page=&limit=),
  getById: (id: string) =>
    api.get<ApiResponse<Product>>(/products/),
  create: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<ApiResponse<Product>>('/products', data),
  update: (id: string, data: Partial<Product>) =>
    api.put<ApiResponse<Product>>(/products/, data),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(/products/),
};
