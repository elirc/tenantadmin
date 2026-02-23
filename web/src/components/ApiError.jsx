export function ApiError({ error }) {
  if (!error) {
    return null;
  }

  const message = error.response?.data?.error || error.message || 'Something went wrong';

  return <p className="error-message">{message}</p>;
}
