import bcrypt from 'bcryptjs';
import {
  createMembershipWithRoles,
  createUser,
  findMembershipById,
  findUserByEmail,
  listTenantMemberships,
  replaceMembershipRoles,
  updateMembershipAndUser
} from '../repositories/userRepository.js';
import { findRolesByIds } from '../repositories/roleRepository.js';
import { buildPageMeta, parsePagination } from '../utils/pagination.js';
import { HttpError } from '../utils/httpError.js';
import { prisma } from '../config/prisma.js';
import { logAuditEvent } from './auditService.js';

const mapMembership = (membership) => ({
  membershipId: membership.id,
  status: membership.status,
  user: {
    id: membership.user.id,
    email: membership.user.email,
    name: membership.user.name,
    createdAt: membership.user.createdAt
  },
  roles: membership.membershipRoles.map((entry) => ({
    id: entry.role.id,
    name: entry.role.name,
    isSystem: entry.role.isSystem
  })),
  createdAt: membership.createdAt,
  updatedAt: membership.updatedAt
});

const validateRolesForTenant = async (tenantId, roleIds) => {
  if (roleIds.length === 0) {
    return;
  }

  const roles = await findRolesByIds(tenantId, roleIds);

  if (roles.length !== roleIds.length) {
    throw new HttpError(400, 'One or more roles are invalid for this tenant');
  }
};

export const listUsers = async ({ tenantId, query }) => {
  const pagination = parsePagination(query, { defaultPageSize: 20, maxPageSize: 100 });

  const { items, total } = await listTenantMemberships({
    tenantId,
    search: query.search?.trim(),
    status: query.status,
    roleId: query.roleId,
    skip: pagination.skip,
    take: pagination.take
  });

  return {
    items: items.map(mapMembership),
    meta: buildPageMeta({ page: pagination.page, pageSize: pagination.pageSize, total })
  };
};

export const createTenantUser = async ({ tenantId, actor, payload }) => {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const roleIds = Array.isArray(payload.roleIds) ? payload.roleIds : [];

  await validateRolesForTenant(tenantId, roleIds);

  const passwordHash = await bcrypt.hash(payload.password, 12);

  const membership = await prisma.$transaction(async (tx) => {
    let user = await findUserByEmail(normalizedEmail, tx);

    if (!user) {
      user = await createUser(
        {
          email: normalizedEmail,
          name: payload.name.trim(),
          passwordHash
        },
        tx
      );
    }

    const existingMembership = await tx.membership.findFirst({
      where: {
        tenantId,
        userId: user.id
      }
    });

    if (existingMembership) {
      throw new HttpError(409, 'User already belongs to this tenant');
    }

    const createdMembership = await createMembershipWithRoles(
      {
        tenantId,
        userId: user.id,
        status: payload.status ?? 'ACTIVE',
        roleIds
      },
      tx
    );

    await logAuditEvent({
      client: tx,
      tenantId,
      actorUserId: actor.user.id,
      actorSessionId: actor.sessionId,
      action: 'users.create',
      resourceType: 'membership',
      resourceId: createdMembership.id,
      metadata: {
        targetUserId: user.id,
        roleIds
      }
    });

    return createdMembership;
  });

  return mapMembership(membership);
};

export const updateTenantUser = async ({ tenantId, membershipId, actor, payload }) => {
  const membership = await prisma.$transaction(async (tx) => {
    const updatedMembership = await updateMembershipAndUser(
      {
        tenantId,
        membershipId,
        status: payload.status,
        userName: payload.name
      },
      tx
    );

    if (!updatedMembership) {
      throw new HttpError(404, 'User membership not found');
    }

    await logAuditEvent({
      client: tx,
      tenantId,
      actorUserId: actor.user.id,
      actorSessionId: actor.sessionId,
      action: 'users.update',
      resourceType: 'membership',
      resourceId: membershipId,
      metadata: {
        status: payload.status,
        name: payload.name
      }
    });

    return updatedMembership;
  });

  return mapMembership(membership);
};

export const replaceTenantUserRoles = async ({ tenantId, membershipId, actor, roleIds }) => {
  await validateRolesForTenant(tenantId, roleIds);

  const updatedMembership = await prisma.$transaction(async (tx) => {
    const existingMembership = await findMembershipById({ tenantId, membershipId }, tx);

    if (!existingMembership) {
      throw new HttpError(404, 'User membership not found');
    }

    const membership = await replaceMembershipRoles(
      {
        tenantId,
        membershipId,
        roleIds
      },
      tx
    );

    await logAuditEvent({
      client: tx,
      tenantId,
      actorUserId: actor.user.id,
      actorSessionId: actor.sessionId,
      action: 'users.roles.update',
      resourceType: 'membership',
      resourceId: membershipId,
      metadata: {
        roleIds
      }
    });

    return membership;
  });

  return mapMembership(updatedMembership);
};
