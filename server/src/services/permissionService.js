import { listPermissions } from '../repositories/permissionRepository.js';
import { ensurePermissionCatalog } from './permissionCatalogService.js';

export const listTenantPermissions = async () => {
  await ensurePermissionCatalog();
  return listPermissions();
};
