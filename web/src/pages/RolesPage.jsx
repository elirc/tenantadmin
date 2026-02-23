import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../api/rolesApi';
import { permissionsApi } from '../api/permissionsApi';
import { ApiError } from '../components/ApiError';
import { AccessDenied } from '../components/AccessDenied';
import { useAuth } from '../hooks/useAuth';

const emptyRoleForm = {
  name: '',
  description: '',
  permissionKeys: []
};

export function RolesPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canRead = hasPermission('roles.read');
  const canManage = hasPermission('roles.manage');
  const canReadPermissions = hasPermission('permissions.read');

  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [form, setForm] = useState(emptyRoleForm);

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
    enabled: canRead
  });

  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: permissionsApi.list,
    enabled: canReadPermissions || canManage
  });

  const selectedRole = useMemo(
    () => rolesQuery.data?.find((role) => role.id === selectedRoleId) ?? null,
    [rolesQuery.data, selectedRoleId]
  );

  const resetForm = () => {
    setSelectedRoleId(null);
    setForm(emptyRoleForm);
  };

  const createMutation = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ roleId, payload }) => rolesApi.update(roleId, payload),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: rolesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });

  if (!canRead) {
    return <AccessDenied permission="roles.read" />;
  }

  const onSubmit = () => {
    if (selectedRoleId) {
      updateMutation.mutate({ roleId: selectedRoleId, payload: form });
      return;
    }

    createMutation.mutate(form);
  };

  return (
    <div className="page-stack">
      <header className="page-title-row">
        <h2>Roles & Permissions</h2>
        <p>Define tenant-specific RBAC roles and permission bundles.</p>
      </header>

      {canManage && (
        <div className="card">
          <h3>{selectedRoleId ? 'Edit Role' : 'Create Role'}</h3>
          <div className="form-grid compact">
            <input
              type="text"
              placeholder="Role name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              type="text"
              placeholder="Description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />

            <div className="permission-grid">
              {(permissionsQuery.data || []).map((permission) => (
                <label key={permission.id}>
                  <input
                    type="checkbox"
                    checked={form.permissionKeys.includes(permission.key)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setForm((prev) => ({
                          ...prev,
                          permissionKeys: [...prev.permissionKeys, permission.key]
                        }));
                        return;
                      }

                      setForm((prev) => ({
                        ...prev,
                        permissionKeys: prev.permissionKeys.filter((key) => key !== permission.key)
                      }));
                    }}
                  />
                  {permission.key}
                </label>
              ))}
            </div>

            <div className="action-row">
              <button type="button" onClick={onSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {selectedRoleId ? 'Update role' : 'Create role'}
              </button>
              {selectedRoleId && (
                <button type="button" className="secondary" onClick={resetForm}>
                  Cancel edit
                </button>
              )}
            </div>
          </div>
          <ApiError error={createMutation.error || updateMutation.error} />
        </div>
      )}

      <div className="card">
        {rolesQuery.isLoading && <p>Loading roles...</p>}
        <ApiError error={rolesQuery.error || deleteMutation.error} />

        {rolesQuery.data && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Permissions</th>
                <th>Members</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rolesQuery.data.map((role) => (
                <tr key={role.id}>
                  <td>
                    {role.name} {role.isSystem && <small>(system)</small>}
                  </td>
                  <td>{role.description}</td>
                  <td>
                    <div className="pill-list">
                      {role.permissions.map((permission) => (
                        <span key={permission.id} className="pill">
                          {permission.key}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{role.memberCount}</td>
                  <td>
                    <div className="action-row">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoleId(role.id);
                            setForm({
                              name: role.name,
                              description: role.description || '',
                              permissionKeys: role.permissions.map((permission) => permission.key)
                            });
                          }}
                        >
                          Edit
                        </button>
                      )}

                      {canManage && !role.isSystem && (
                        <button
                          type="button"
                          className="danger"
                          onClick={() => deleteMutation.mutate(role.id)}
                          disabled={role.memberCount > 0}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedRole && selectedRole.isSystem && (
        <p className="hint">Editing system roles is allowed, but deleting them is blocked.</p>
      )}
    </div>
  );
}
