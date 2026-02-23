import { apiClient, unwrapData } from './client';

export const authApi = {
  register: async (payload) => unwrapData(await apiClient.post('/auth/register', payload)),
  login: async (payload) => unwrapData(await apiClient.post('/auth/login', payload)),
  me: async () => unwrapData(await apiClient.get('/auth/me')),
  logout: async () => {
    await apiClient.post('/auth/logout');
  },
  requestMagicLink: async (payload) => unwrapData(await apiClient.post('/auth/magic-link/request', payload)),
  consumeMagicLink: async (payload) => unwrapData(await apiClient.post('/auth/magic-link/consume', payload)),
  switchTenant: async (tenantId) => unwrapData(await apiClient.post('/auth/switch-tenant', { tenantId }))
};
