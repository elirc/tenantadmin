import { apiClient, unwrapData } from './client';

export const rolesApi = {
  list: async () => unwrapData(await apiClient.get('/roles')),
  create: async (payload) => unwrapData(await apiClient.post('/roles', payload)),
  update: async (roleId, payload) => unwrapData(await apiClient.patch(`/roles/${roleId}`, payload)),
  remove: async (roleId) => {
    await apiClient.delete(`/roles/${roleId}`);
  }
};
