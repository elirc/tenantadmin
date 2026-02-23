export function AccessDenied({ permission }) {
  return (
    <div className="card">
      <h2>Access denied</h2>
      <p>You do not have the required permission: {permission}</p>
    </div>
  );
}
