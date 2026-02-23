import { prisma } from '../config/prisma.js';
import { toJsonString } from '../utils/json.js';

export const logAuditEvent = async ({
  tenantId,
  action,
  resourceType,
  resourceId = null,
  actorUserId = null,
  actorSessionId = null,
  metadata = null,
  client = prisma
}) => {
  if (!tenantId) {
    return null;
  }

  return client.auditLog.create({
    data: {
      tenantId,
      action,
      resourceType,
      resourceId,
      actorUserId,
      actorSessionId,
      metadata: metadata ? toJsonString(metadata) : null
    }
  });
};
