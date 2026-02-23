import { apiClient, unwrapData } from './client';

export const permissionsApi = {
  list: async () => unwrapData(await apiClient.get('/permissions'))
};
