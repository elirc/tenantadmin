import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ALL_PERMISSION_KEYS, PERMISSIONS } from '../policies/permissions.js';
import { hashToken, generateToken } from '../utils/crypto.js';
import { HttpError } from '../utils/httpError.js';
import { toJsonString } from '../utils/json.js';
import { slugify } from '../utils/slugify.js';
import { ensurePermissionCatalog } from './permissionCatalogService.js';
import { logAuditEvent } from './auditService.js';

const hashPassword = async (password) => bcrypt.hash(password, 12);

const createSession = async (
  { userId, tenantId, ipAddress = null, userAgent = null },
  client = prisma
) => {
  const token = generateToken(64);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const session = await client.session.create({
    data: {
      userId,
      tenantId,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent
    }
  });

  return { token, session };
};

const resolvePermissionContext = async ({ userId, tenantId }) => {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      tenantId,
      status: 'ACTIVE'
    },
    include: {
      membershipRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!membership) {
    return null;
  }

  const roles = membership.membershipRoles.map((entry) => ({
    id: entry.role.id,
    name: entry.role.name,
    isSystem: entry.role.isSystem
  }));

  const permissionSet = new Set(
    membership.membershipRoles.flatMap((entry) =>
      entry.role.rolePermissions.map((rolePermission) => rolePermission.permission.key)
    )
  );

  return {
    membership,
    roles,
    permissionSet
  };
};

export const buildSessionContext = async (sessionToken) => {
  const tokenHash = hashToken(sessionToken);

  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: true,
      tenant: true
    }
  });

  if (!session) {
    return null;
  }

  const permissionContext = await resolvePermissionContext({
    userId: session.userId,
    tenantId: session.tenantId
  });

  if (!permissionContext) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() }
  });

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name
    },
    tenant: {
      id: session.tenant.id,
      slug: session.tenant.slug,
      name: session.tenant.name
    },
    membership: {
      id: permissionContext.membership.id,
      status: permissionContext.membership.status
    },
    roles: permissionContext.roles,
    permissions: permissionContext.permissionSet,
    permissionList: [...permissionContext.permissionSet]
  };
};

const findTenantMembershipForUser = async (userId, tenantSlug = null) => {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      status: 'ACTIVE'
    },
    include: {
      tenant: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (memberships.length === 0) {
    return null;
  }

  if (!tenantSlug) {
    return memberships[0];
  }

  return memberships.find((membership) => membership.tenant.slug === tenantSlug) ?? null;
};

export const register = async ({ email, password, name, tenantName, tenantSlug }, requestMeta) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedSlug = slugify(tenantSlug || tenantName);

  if (!normalizedSlug) {
    throw new HttpError(400, 'Tenant slug could not be derived from tenant name');
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  if (existingUser) {
    throw new HttpError(409, 'Email already in use');
  }

  const payload = await prisma.$transaction(async (tx) => {
    await ensurePermissionCatalog(tx);

    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash: await hashPassword(password)
      }
    });

    const tenant = await tx.tenant.create({
      data: {
        name: tenantName.trim(),
        slug: normalizedSlug
      }
    });

    const membership = await tx.membership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        status: 'ACTIVE'
      }
    });

    const allPermissions = await tx.permission.findMany({
      where: {
        key: {
          in: ALL_PERMISSION_KEYS
        }
      }
    });

    const ownerRole = await tx.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Owner',
        description: 'Full access role for tenant owners',
        isSystem: true,
        rolePermissions: {
          createMany: {
            data: allPermissions.map((permission) => ({ permissionId: permission.id }))
          }
        }
      }
    });

    const memberPermissionKeys = [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.PERMISSIONS_READ,
      PERMISSIONS.SETTINGS_READ,
      PERMISSIONS.AUDIT_READ
    ];

    const memberPermissions = allPermissions.filter((permission) =>
      memberPermissionKeys.includes(permission.key)
    );

    await tx.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Member',
        description: 'Default limited role for tenant members',
        isSystem: true,
        rolePermissions: {
          createMany: {
            data: memberPermissions.map((permission) => ({ permissionId: permission.id }))
          }
        }
      }
    });

    await tx.membershipRole.create({
      data: {
        membershipId: membership.id,
        roleId: ownerRole.id
      }
    });

    await tx.tenantSetting.createMany({
      data: [
        {
          tenantId: tenant.id,
          key: 'branding',
          value: toJsonString({
            companyName: tenant.name,
            primaryColor: '#0a2540'
          }),
          updatedByUserId: user.id
        },
        {
          tenantId: tenant.id,
          key: 'security',
          value: toJsonString({
            mfaRequired: false,
            passwordRotationDays: 90
          }),
          updatedByUserId: user.id
        }
      ]
    });

    await logAuditEvent({
      client: tx,
      tenantId: tenant.id,
      actorUserId: user.id,
      action: 'auth.register',
      resourceType: 'tenant',
      resourceId: tenant.id,
      metadata: { email: user.email }
    });

    return { user, tenant };
  });

  const { token, session } = await createSession({
    userId: payload.user.id,
    tenantId: payload.tenant.id,
    ipAddress: requestMeta.ipAddress,
    userAgent: requestMeta.userAgent
  });

  await logAuditEvent({
    tenantId: payload.tenant.id,
    actorUserId: payload.user.id,
    actorSessionId: session.id,
    action: 'auth.login',
    resourceType: 'session',
    resourceId: session.id,
    metadata: { method: 'password' }
  });

  const context = await buildSessionContext(token);
  return { token, context };
};

export const login = async ({ email, password, tenantSlug }, requestMeta) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  if (!user?.passwordHash) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const membership = await findTenantMembershipForUser(user.id, tenantSlug);

  if (!membership) {
    throw new HttpError(404, 'No active tenant membership found');
  }

  const { token, session } = await createSession({
    userId: user.id,
    tenantId: membership.tenantId,
    ipAddress: requestMeta.ipAddress,
    userAgent: requestMeta.userAgent
  });

  await logAuditEvent({
    tenantId: membership.tenantId,
    actorUserId: user.id,
    actorSessionId: session.id,
    action: 'auth.login',
    resourceType: 'session',
    resourceId: session.id,
    metadata: { method: 'password' }
  });

  const context = await buildSessionContext(token);

  return { token, context };
};

export const requestMagicLink = async ({ email, tenantSlug }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  if (!user) {
    return { accepted: true };
  }

  const membership = await findTenantMembershipForUser(user.id, tenantSlug);

  if (!membership) {
    return { accepted: true };
  }

  const token = generateToken(48);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + env.MAGIC_LINK_TTL_MINUTES * 60 * 1000);

  await prisma.magicLinkToken.create({
    data: {
      userId: user.id,
      tenantId: membership.tenantId,
      tokenHash,
      expiresAt
    }
  });

  const magicLinkUrl = `${env.APP_BASE_URL}/magic-link?token=${token}`;
  console.log(`Magic link for ${user.email}: ${magicLinkUrl}`);

  await logAuditEvent({
    tenantId: membership.tenantId,
    actorUserId: user.id,
    action: 'auth.magic_link.request',
    resourceType: 'magic_link',
    metadata: { tenantSlug: membership.tenant.slug }
  });

  return {
    accepted: true,
    ...(env.NODE_ENV !== 'production' ? { magicLinkUrl } : {})
  };
};

export const consumeMagicLink = async ({ token }, requestMeta) => {
  const tokenHash = hashToken(token);

  const magicToken = await prisma.magicLinkToken.findFirst({
    where: {
      tokenHash,
      consumedAt: null,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  if (!magicToken) {
    throw new HttpError(400, 'Magic link is invalid or expired');
  }

  const payload = await prisma.$transaction(async (tx) => {
    const consumeResult = await tx.magicLinkToken.updateMany({
      where: {
        id: magicToken.id,
        consumedAt: null
      },
      data: {
        consumedAt: new Date()
      }
    });

    if (consumeResult.count !== 1) {
      throw new HttpError(400, 'Magic link already consumed');
    }

    const { token: sessionToken, session } = await createSession(
      {
        userId: magicToken.userId,
        tenantId: magicToken.tenantId,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent
      },
      tx
    );

    await logAuditEvent({
      client: tx,
      tenantId: magicToken.tenantId,
      actorUserId: magicToken.userId,
      actorSessionId: session.id,
      action: 'auth.login',
      resourceType: 'session',
      resourceId: session.id,
      metadata: { method: 'magic-link' }
    });

    return { sessionToken };
  });

  const context = await buildSessionContext(payload.sessionToken);

  return {
    token: payload.sessionToken,
    context
  };
};

export const logout = async (sessionToken) => {
  const tokenHash = hashToken(sessionToken);

  await prisma.session.updateMany({
    where: {
      tokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
};

export const switchTenant = async ({ authContext, tenantId }) => {
  const membership = await prisma.membership.findFirst({
    where: {
      tenantId,
      userId: authContext.user.id,
      status: 'ACTIVE'
    }
  });

  if (!membership) {
    throw new HttpError(404, 'Membership not found for target tenant');
  }

  const updated = await prisma.session.updateMany({
    where: {
      id: authContext.sessionId,
      userId: authContext.user.id,
      revokedAt: null
    },
    data: {
      tenantId,
      lastUsedAt: new Date()
    }
  });

  if (updated.count !== 1) {
    throw new HttpError(401, 'Session is no longer active');
  }

  await logAuditEvent({
    tenantId,
    actorUserId: authContext.user.id,
    actorSessionId: authContext.sessionId,
    action: 'auth.tenant_switch',
    resourceType: 'tenant',
    resourceId: tenantId
  });
};

export const listUserTenants = async (userId) => {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      status: 'ACTIVE'
    },
    include: {
      tenant: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  return memberships.map((membership) => ({
    membershipId: membership.id,
    tenantId: membership.tenant.id,
    tenantName: membership.tenant.name,
    tenantSlug: membership.tenant.slug
  }));
};
