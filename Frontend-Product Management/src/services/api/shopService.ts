import { api } from '../api';
import type { ApiResponse, Shop } from '@/types';

export interface UpdateShopPayload {
  name?: string;
  shopType?: string;
  gstin?: string | null;
  currency?: string;
}

export const shopService = {
  getCurrentShop: () => api.get<ApiResponse<Shop>>('/shops/current'),
  updateCurrentShop: (payload: UpdateShopPayload) =>
    api.patch<ApiResponse<Shop>>('/shops/current', payload),
};
