import { apiClient, unwrapData } from './client';

export const settingsApi = {
  list: async () => unwrapData(await apiClient.get('/settings')),
  update: async (key, value) => unwrapData(await apiClient.put(`/settings/${key}`, { value }))
};
