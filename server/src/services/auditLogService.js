import { listAuditLogsByTenant } from '../repositories/auditLogRepository.js';
import { parsePagination, buildPageMeta } from '../utils/pagination.js';
import { fromJsonString } from '../utils/json.js';

export const listAuditLogs = async ({ tenantId, query }) => {
  const pagination = parsePagination(query, { defaultPageSize: 25, maxPageSize: 100 });

  const { items, total } = await listAuditLogsByTenant({
    tenantId,
    action: query.action,
    resourceType: query.resourceType,
    actorUserId: query.actorUserId,
    skip: pagination.skip,
    take: pagination.take
  });

  return {
    items: items.map((item) => ({
      ...item,
      metadata: fromJsonString(item.metadata, null)
    })),
    meta: buildPageMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total
    })
  };
};
