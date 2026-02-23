import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';

export const AuthContext = createContext(null);

const isUnauthorizedError = (error) => error?.response?.status === 401;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const data = await authApi.me();
      setSession(data);
      return data;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setSession(null);
        return null;
      }

      throw error;
    }
  }, []);

  useEffect(() => {
    refreshSession().finally(() => {
      setLoading(false);
    });
  }, [refreshSession]);

  const login = useCallback(async (payload) => {
    const data = await authApi.login(payload);
    setSession(data);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    setSession(data);
    return data;
  }, []);

  const requestMagicLink = useCallback(async (payload) => {
    return authApi.requestMagicLink(payload);
  }, []);

  const consumeMagicLink = useCallback(async (payload) => {
    const data = await authApi.consumeMagicLink(payload);
    setSession(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setSession(null);
  }, []);

  const switchTenant = useCallback(
    async (tenantId) => {
      await authApi.switchTenant(tenantId);
      await refreshSession();
    },
    [refreshSession]
  );

  const value = useMemo(() => {
    const permissionSet = new Set(session?.permissions ?? []);

    return {
      loading,
      session,
      isAuthenticated: Boolean(session),
      user: session?.user ?? null,
      tenant: session?.tenant ?? null,
      tenants: session?.tenants ?? [],
      permissions: permissionSet,
      hasPermission: (permissionKey) => permissionSet.has(permissionKey),
      login,
      register,
      requestMagicLink,
      consumeMagicLink,
      logout,
      switchTenant,
      refreshSession
    };
  }, [loading, session, login, register, requestMagicLink, consumeMagicLink, logout, switchTenant, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
