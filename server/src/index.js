import { app } from './app.js';
import { env } from './config/env.js';
import { ensurePermissionCatalog } from './services/permissionCatalogService.js';

const start = async () => {
  await ensurePermissionCatalog();

  app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
