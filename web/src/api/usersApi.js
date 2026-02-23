import { apiClient, unwrapData, unwrapPaginated } from './client';

export const usersApi = {
  list: async (params) => unwrapPaginated(await apiClient.get('/users', { params })),
  create: async (payload) => unwrapData(await apiClient.post('/users', payload)),
  update: async (membershipId, payload) =>
    unwrapData(await apiClient.patch(`/users/${membershipId}`, payload)),
  replaceRoles: async (membershipId, roleIds) =>
    unwrapData(await apiClient.put(`/users/${membershipId}/roles`, { roleIds }))
};
