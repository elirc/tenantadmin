import { HttpError } from '../utils/httpError.js';

export const can = (auth, permissionKey, resourceTenantId = null) => {
  if (!auth) {
    return false;
  }

  if (resourceTenantId && auth.tenant.id !== resourceTenantId) {
    return false;
  }

  return auth.permissions.has(permissionKey);
};

export const assertCan = (auth, permissionKey, resourceTenantId = null) => {
  if (!can(auth, permissionKey, resourceTenantId)) {
    throw new HttpError(403, `Forbidden for permission: ${permissionKey}`);
  }
};
