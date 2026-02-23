import { prisma } from '../config/prisma.js';
import { listTenantSettings, upsertTenantSetting } from '../repositories/settingsRepository.js';
import { logAuditEvent } from './auditService.js';
import { fromJsonString, toJsonString } from '../utils/json.js';

export const listSettings = async (tenantId) => {
  const settings = await listTenantSettings(tenantId);

  return settings.map((setting) => ({
    ...setting,
    value: fromJsonString(setting.value, {})
  }));
};

export const updateSetting = async ({ tenantId, key, value, actor }) => {
  const setting = await prisma.$transaction(async (tx) => {
    const updatedSetting = await upsertTenantSetting(
      {
        tenantId,
        key,
        value: toJsonString(value),
        updatedByUserId: actor.user.id
      },
      tx
    );

    await logAuditEvent({
      client: tx,
      tenantId,
      actorUserId: actor.user.id,
      actorSessionId: actor.sessionId,
      action: 'settings.update',
      resourceType: 'tenant_setting',
      resourceId: updatedSetting.id,
      metadata: {
        key,
        value
      }
    });

    return updatedSetting;
  });

  return {
    ...setting,
    value: fromJsonString(setting.value, {})
  };
};
