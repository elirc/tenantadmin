import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/settingsApi';
import { ApiError } from '../components/ApiError';
import { AccessDenied } from '../components/AccessDenied';
import { useAuth } from '../hooks/useAuth';

export function SettingsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canRead = hasPermission('settings.read');
  const canUpdate = hasPermission('settings.update');

  const [drafts, setDrafts] = useState({});
  const [parseError, setParseError] = useState(null);

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.list,
    enabled: canRead
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }) => settingsApi.update(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });

  const normalizedDrafts = useMemo(() => {
    const map = {};

    for (const setting of settingsQuery.data || []) {
      map[setting.key] = drafts[setting.key] ?? JSON.stringify(setting.value, null, 2);
    }

    return map;
  }, [drafts, settingsQuery.data]);

  if (!canRead) {
    return <AccessDenied permission="settings.read" />;
  }

  return (
    <div className="page-stack">
      <header className="page-title-row">
        <h2>Tenant Settings</h2>
        <p>Settings are scoped to the active tenant and tracked in the audit log.</p>
      </header>

      <div className="card">
        {settingsQuery.isLoading && <p>Loading settings...</p>}
        <ApiError error={settingsQuery.error || updateMutation.error} />

        {(settingsQuery.data || []).map((setting) => (
          <div key={setting.id} className="setting-row">
            <div>
              <h4>{setting.key}</h4>
              <small>Last updated: {new Date(setting.updatedAt).toLocaleString()}</small>
            </div>
            <textarea
              rows={8}
              value={normalizedDrafts[setting.key] || ''}
              onChange={(event) =>
                setDrafts((prev) => ({
                  ...prev,
                  [setting.key]: event.target.value
                }))
              }
            />
            {canUpdate && (
              <button
                type="button"
                onClick={() => {
                  try {
                    const raw = normalizedDrafts[setting.key] || '{}';
                    const parsed = JSON.parse(raw);
                    setParseError(null);
                    updateMutation.mutate({ key: setting.key, value: parsed });
                  } catch (error) {
                    setParseError(new Error(`Invalid JSON for setting "${setting.key}"`));
                  }
                }}
              >
                Save {setting.key}
              </button>
            )}
          </div>
        ))}

        <ApiError error={parseError} />
      </div>
    </div>
  );
}
