export const PERMISSIONS = Object.freeze({
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_ROLES_MANAGE: 'users.roles.manage',
  ROLES_READ: 'roles.read',
  ROLES_MANAGE: 'roles.manage',
  PERMISSIONS_READ: 'permissions.read',
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  AUDIT_READ: 'audit.read'
});

export const PERMISSION_CATALOG = [
  { key: PERMISSIONS.USERS_READ, description: 'View users in tenant' },
  { key: PERMISSIONS.USERS_CREATE, description: 'Create users in tenant' },
  { key: PERMISSIONS.USERS_UPDATE, description: 'Update users in tenant' },
  { key: PERMISSIONS.USERS_ROLES_MANAGE, description: 'Assign and remove user roles' },
  { key: PERMISSIONS.ROLES_READ, description: 'View roles in tenant' },
  { key: PERMISSIONS.ROLES_MANAGE, description: 'Create/update/delete roles' },
  { key: PERMISSIONS.PERMISSIONS_READ, description: 'View permission catalog' },
  { key: PERMISSIONS.SETTINGS_READ, description: 'View tenant settings' },
  { key: PERMISSIONS.SETTINGS_UPDATE, description: 'Update tenant settings' },
  { key: PERMISSIONS.AUDIT_READ, description: 'View audit logs' }
];

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map((permission) => permission.key);
