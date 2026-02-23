export const serializeAuthContext = (context, tenants = []) => ({
  user: context.user,
  tenant: context.tenant,
  membership: context.membership,
  roles: context.roles,
  permissions: context.permissionList,
  tenants
});
