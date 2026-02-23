import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api/auditApi';
import { ApiError } from '../components/ApiError';
import { PaginationControls } from '../components/PaginationControls';
import { AccessDenied } from '../components/AccessDenied';
import { useAuth } from '../hooks/useAuth';

export function AuditLogsPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('audit.read');

  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [actorUserId, setActorUserId] = useState('');

  const params = useMemo(
    () => ({
      page,
      pageSize: 20,
      action: action || undefined,
      resourceType: resourceType || undefined,
      actorUserId: actorUserId || undefined
    }),
    [action, actorUserId, page, resourceType]
  );

  const query = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditApi.list(params),
    enabled: canRead
  });

  if (!canRead) {
    return <AccessDenied permission="audit.read" />;
  }

  return (
    <div className="page-stack">
      <header className="page-title-row">
        <h2>Audit Logs</h2>
        <p>Immutable activity stream across users, roles, settings, and auth actions.</p>
      </header>

      <div className="card filter-grid">
        <input
          type="text"
          placeholder="Action (e.g., users.create)"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
        />
        <input
          type="text"
          placeholder="Resource type"
          value={resourceType}
          onChange={(event) => {
            setResourceType(event.target.value);
            setPage(1);
          }}
        />
        <input
          type="text"
          placeholder="Actor user ID"
          value={actorUserId}
          onChange={(event) => {
            setActorUserId(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="card">
        {query.isLoading && <p>Loading logs...</p>}
        <ApiError error={query.error} />

        {query.data && (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Actor</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.action}</td>
                    <td>
                      {log.resourceType}
                      {log.resourceId ? ` (${log.resourceId})` : ''}
                    </td>
                    <td>{log.actorUser?.email || 'system'}</td>
                    <td>
                      <pre>{JSON.stringify(log.metadata || {}, null, 2)}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <PaginationControls meta={query.data.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
