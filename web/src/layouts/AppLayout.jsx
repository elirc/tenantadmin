import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/app/users', label: 'Users' },
  { to: '/app/roles', label: 'Roles' },
  { to: '/app/settings', label: 'Settings' },
  { to: '/app/audit-logs', label: 'Audit Logs' }
];

export function AppLayout() {
  const { tenant, tenants, user, logout, switchTenant } = useAuth();
  const navigate = useNavigate();

  const onTenantChange = async (event) => {
    await switchTenant(event.target.value);
  };

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-block">
          <h1>SaaS Admin</h1>
          <p>{tenant?.name}</p>
        </div>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="app-content">
        <header className="app-header">
          <div>
            <label htmlFor="tenant-switch">Tenant</label>
            <select id="tenant-switch" value={tenant?.id ?? ''} onChange={onTenantChange}>
              {tenants.map((entry) => (
                <option key={entry.tenantId} value={entry.tenantId}>
                  {entry.tenantName}
                </option>
              ))}
            </select>
          </div>

          <div className="header-actions">
            <span>{user?.email}</span>
            <button type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
