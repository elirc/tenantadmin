import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../components/ApiError';
import { useAuth } from '../hooks/useAuth';

const initialRegister = {
  email: '',
  password: '',
  name: '',
  tenantName: '',
  tenantSlug: ''
};

export function LoginPage() {
  const {
    isAuthenticated,
    login,
    register,
    requestMagicLink
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '', tenantSlug: '' });
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [magicLinkForm, setMagicLinkForm] = useState({ email: '', tenantSlug: '' });
  const [magicLinkResult, setMagicLinkResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app/users', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const target = location.state?.from || '/app/users';

  const onLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({
        email: loginForm.email,
        password: loginForm.password,
        tenantSlug: loginForm.tenantSlug || undefined
      });
      navigate(target, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register({
        ...registerForm,
        tenantSlug: registerForm.tenantSlug || undefined
      });
      navigate('/app/users', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const onRequestMagicLink = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await requestMagicLink({
        email: magicLinkForm.email,
        tenantSlug: magicLinkForm.tenantSlug || undefined
      });

      setMagicLinkResult(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Multi-tenant SaaS Admin</h1>
        <p>Sign in with password or request a magic link.</p>

        <div className="tab-row">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Login
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Register
          </button>
          <button type="button" className={mode === 'magic' ? 'active' : ''} onClick={() => setMode('magic')}>
            Magic Link
          </button>
        </div>

        {mode === 'login' && (
          <form onSubmit={onLogin} className="form-grid">
            <input
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Tenant slug (optional)"
              value={loginForm.tenantSlug}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, tenantSlug: event.target.value }))}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={onRegister} className="form-grid">
            <input
              type="text"
              placeholder="Full name"
              value={registerForm.name}
              onChange={(event) => setRegisterForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={registerForm.email}
              onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={registerForm.password}
              onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Tenant name"
              value={registerForm.tenantName}
              onChange={(event) => setRegisterForm((prev) => ({ ...prev, tenantName: event.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Tenant slug (optional)"
              value={registerForm.tenantSlug}
              onChange={(event) => setRegisterForm((prev) => ({ ...prev, tenantSlug: event.target.value }))}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create tenant'}
            </button>
          </form>
        )}

        {mode === 'magic' && (
          <form onSubmit={onRequestMagicLink} className="form-grid">
            <input
              type="email"
              placeholder="Email"
              value={magicLinkForm.email}
              onChange={(event) => setMagicLinkForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Tenant slug (optional)"
              value={magicLinkForm.tenantSlug}
              onChange={(event) => setMagicLinkForm((prev) => ({ ...prev, tenantSlug: event.target.value }))}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Request magic link'}
            </button>
          </form>
        )}

        <ApiError error={error} />

        {magicLinkResult?.magicLinkUrl && (
          <div className="dev-link-box">
            <p>Development magic link:</p>
            <a href={magicLinkResult.magicLinkUrl}>{magicLinkResult.magicLinkUrl}</a>
          </div>
        )}
      </div>
    </div>
  );
}
