import { apiClient, unwrapPaginated } from './client';

export const auditApi = {
  list: async (params) => unwrapPaginated(await apiClient.get('/audit-logs', { params }))
};
