import { api } from '../api';
import type { PaginatedResponse, ApiResponse, AuditLogItem } from '@/types';

export const auditService = {
  getAuditLogs: (params?: { page?: number; limit?: number; action?: string; entity?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.action) q.append('action', params.action);
    if (params?.entity) q.append('entity', params.entity);
    const query = q.toString() ? `?${q.toString()}` : '';
    return api.get<PaginatedResponse<AuditLogItem>>(`/audit-logs${query}`);
  },

  getAuditLogById: (id: string) => api.get<ApiResponse<AuditLogItem>>(`/audit-logs/${id}`),
};
