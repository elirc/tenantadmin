import { listTenantPermissions } from '../services/permissionService.js';

export const listPermissionsController = async (_req, res) => {
  const permissions = await listTenantPermissions();
  return res.json({ data: permissions });
};
