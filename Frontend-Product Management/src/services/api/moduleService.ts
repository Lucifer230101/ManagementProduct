import { api } from '../api';
import type { ApiResponse, ShopModuleItem } from '@/types';

export const moduleService = {
  getModules: () => api.get<ApiResponse<ShopModuleItem[]>>('/modules'),

  getEnabledModules: () => api.get<ApiResponse<ShopModuleItem[]>>('/modules/enabled'),

  toggleModule: (moduleName: string, isEnabled: boolean) =>
    api.patch<ApiResponse<ShopModuleItem>>(`/modules/${moduleName}`, { isEnabled }),
};
