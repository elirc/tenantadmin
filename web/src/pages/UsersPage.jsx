import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { rolesApi } from '../api/rolesApi';
import { ApiError } from '../components/ApiError';
import { PaginationControls } from '../components/PaginationControls';
import { AccessDenied } from '../components/AccessDenied';
import { useAuth } from '../hooks/useAuth';

function UserRow({ item, roles, canUpdate, canManageRoles, onUpdate, onReplaceRoles }) {
  const [name, setName] = useState(item.user.name);
  const [status, setStatus] = useState(item.status);
  const [selectedRoleIds, setSelectedRoleIds] = useState(item.roles.map((role) => role.id));

  useEffect(() => {
    setName(item.user.name);
    setStatus(item.status);
    setSelectedRoleIds(item.roles.map((role) => role.id));
  }, [item]);

  return (
    <tr>
      <td>
        <div>
          <strong>{item.user.email}</strong>
        </div>
        <small>ID: {item.user.id}</small>
      </td>
      <td>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={!canUpdate}
        />
      </td>
      <td>
        <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={!canUpdate}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="INVITED">INVITED</option>
        </select>
      </td>
      <td>
        <div className="role-checklist">
          {roles.map((role) => (
            <label key={role.id}>
              <input
                type="checkbox"
                checked={selectedRoleIds.includes(role.id)}
                disabled={!canManageRoles}
                onChange={(event) => {
                  if (event.target.checked) {
                    setSelectedRoleIds((prev) => [...prev, role.id]);
                    return;
                  }

                  setSelectedRoleIds((prev) => prev.filter((id) => id !== role.id));
                }}
              />
              {role.name}
            </label>
          ))}
        </div>
      </td>
      <td>
        <div className="action-row">
          {canUpdate && (
            <button type="button" onClick={() => onUpdate(item.membershipId, { name, status })}>
              Save Profile
            </button>
          )}
          {canManageRoles && (
            <button type="button" onClick={() => onReplaceRoles(item.membershipId, selectedRoleIds)}>
              Save Roles
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const canRead = hasPermission('users.read');
  const canCreate = hasPermission('users.create');
  const canUpdate = hasPermission('users.update');
  const canManageRoles = hasPermission('users.roles.manage');
  const canReadRoles = hasPermission('roles.read');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [roleId, setRoleId] = useState('');

  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    status: 'ACTIVE',
    roleIds: []
  });

  const [createError, setCreateError] = useState(null);

  const params = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search || undefined,
      status: status || undefined,
      roleId: roleId || undefined
    }),
    [page, roleId, search, status]
  );

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
    enabled: canReadRoles || canManageRoles
  });

  const usersQuery = useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.list(params),
    enabled: canRead
  });

  const updateMutation = useMutation({
    mutationFn: ({ membershipId, payload }) => usersApi.update(membershipId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const replaceRolesMutation = useMutation({
    mutationFn: ({ membershipId, roleIds }) => usersApi.replaceRoles(membershipId, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      setCreateError(null);
      setNewUser({ email: '', name: '', password: '', status: 'ACTIVE', roleIds: [] });
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      setCreateError(error);
    }
  });

  if (!canRead) {
    return <AccessDenied permission="users.read" />;
  }

  const roleOptions = rolesQuery.data || [];

  return (
    <div className="page-stack">
      <header className="page-title-row">
        <h2>Users</h2>
        <p>Manage users, status, and role assignments inside this tenant.</p>
      </header>

      <div className="card filter-grid">
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="INVITED">INVITED</option>
        </select>

        <select
          value={roleId}
          onChange={(event) => {
            setRoleId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          {roleOptions.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {canCreate && (
        <div className="card">
          <h3>Create User</h3>
          <div className="form-grid compact">
            <input
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
            />
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
            />
            <select
              value={newUser.status}
              onChange={(event) => setNewUser((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="INVITED">INVITED</option>
            </select>
            <div className="role-checklist">
              {roleOptions.map((role) => (
                <label key={role.id}>
                  <input
                    type="checkbox"
                    checked={newUser.roleIds.includes(role.id)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setNewUser((prev) => ({ ...prev, roleIds: [...prev.roleIds, role.id] }));
                        return;
                      }

                      setNewUser((prev) => ({
                        ...prev,
                        roleIds: prev.roleIds.filter((id) => id !== role.id)
                      }));
                    }}
                  />
                  {role.name}
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate(newUser)}
            >
              {createMutation.isPending ? 'Creating...' : 'Create user'}
            </button>
          </div>
          <ApiError error={createError} />
        </div>
      )}

      <div className="card">
        {usersQuery.isLoading && <p>Loading users...</p>}
        <ApiError error={usersQuery.error || updateMutation.error || replaceRolesMutation.error} />

        {usersQuery.data && (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Roles</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.data.map((item) => (
                  <UserRow
                    key={item.membershipId}
                    item={item}
                    roles={roleOptions}
                    canUpdate={canUpdate}
                    canManageRoles={canManageRoles}
                    onUpdate={(membershipId, payload) => updateMutation.mutate({ membershipId, payload })}
                    onReplaceRoles={(membershipId, roleIds) =>
                      replaceRolesMutation.mutate({ membershipId, roleIds })
                    }
                  />
                ))}
              </tbody>
            </table>

            <PaginationControls meta={usersQuery.data.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
