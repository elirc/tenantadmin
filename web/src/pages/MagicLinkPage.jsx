import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../components/ApiError';
import { useAuth } from '../hooks/useAuth';

export function MagicLinkPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { consumeMagicLink } = useAuth();

  const token = params.get('token');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setError(new Error('Missing token parameter'));
        setLoading(false);
        return;
      }

      try {
        await consumeMagicLink({ token });
        navigate('/app/users', { replace: true });
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [consumeMagicLink, navigate, token]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Magic Link Sign-in</h1>
        {loading && <p>Signing you in...</p>}
        <ApiError error={error} />
      </div>
    </div>
  );
}
