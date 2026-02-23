import { listAuditLogs } from '../services/auditLogService.js';

export const listAuditLogsController = async (req, res) => {
  const result = await listAuditLogs({
    tenantId: req.auth.tenant.id,
    query: req.query
  });

  return res.json({ data: result.items, meta: result.meta });
};
