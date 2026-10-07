# Multi-tenant SaaS Admin (RBAC + Audit Logs)

Full-stack JavaScript app for tenant-scoped admin operations:

- Email/password auth + magic-link auth (opaque session tokens, stored hashed)
- Tenant scope derived from the session on every protected route
- Role-based access control (RBAC) with a fixed permission catalog
- Append-only audit log (`who did what, when`) — no update/delete endpoints
- Admin UI with server-side pagination and filtering

There are **no automated tests** in this repo, and both `lint` scripts are `echo` stubs
(`server/package.json:14`, `web/package.json:10`). Everything below was read from the
source; nothing here was produced by running the app.

## Stack

- Backend: Node.js (ESM), Express 4, Prisma Client 6, SQLite (`server/package.json`)
- Frontend: React 18, Vite 6, React Router 6, TanStack Query 5, axios (`web/package.json`)
- Validation: Zod (request bodies in controllers, env in `server/src/config/env.js`)

## Project Layout

- `server/` — API, auth/session, RBAC checks, tenant-scoped services, audit logging
  - `src/routes/` → `src/controllers/` (Zod parsing) → `src/services/` (business rules, transactions, audit writes) → `src/repositories/` (Prisma queries)
  - `prisma/schema.prisma` — data model; `prisma/init.js` — raw-SQL table bootstrap; `prisma/seed.js` — permission seed
- `web/` — admin UI for users / roles / settings / audit log
  - `src/context/AuthContext.jsx` holds the session; `src/components/PermissionGate.jsx` and the `hasPermission` checks in each page mirror server permissions

## Quick Start

1. Install dependencies (npm workspaces, root `package.json:5-8`):

```bash
npm install
```

2. Configure env files:

```bash
copy server\.env.example server\.env
copy web\.env.example web\.env
```

3. Generate the Prisma client, create tables, seed permissions:

```bash
npm run prisma:generate -w server
npm run seed -w server
```

`seed` runs `db:init && node prisma/seed.js` (`server/package.json:13`). Note that
`prisma:migrate` and `prisma:push` are **aliases for `db:init`** (`server/package.json:10-11`),
not Prisma Migrate: tables are created by the hand-written `CREATE TABLE IF NOT EXISTS`
statements in `server/prisma/init.js:6-143`. See the drift warning under Senior review.

4. Start both backend and frontend:

```bash
npm run dev
```

- API: `http://localhost:4000/api` (health: `GET /api/health`, `server/src/routes/index.js:12-17`)
- Web: `http://localhost:5173`

There is no seeded user or tenant. Create one via the Register form (or `POST /api/auth/register`);
registration creates the tenant, an `Owner` and a `Member` system role, and two default settings.

## Configuration

`server/src/config/env.js:4-13` validates the environment with Zod at import time; a bad
value crashes startup. Defaults: `NODE_ENV=development`, `PORT=4000`,
`SESSION_TTL_DAYS=14`, `MAGIC_LINK_TTL_MINUTES=15`, `SESSION_COOKIE_NAME=saas_session`.
`DATABASE_URL` has no default. The web client reads `VITE_API_URL`
(`web/src/api/client.js:3`, falling back to `http://localhost:4000/api`).

## Core Modules

### Request pipeline

`server/src/app.js:14-34` mounts, in order: CORS (only `WEB_ORIGIN`, credentials on),
helmet, morgan, `express.json({ limit: '1mb' })`, cookie-parser, then
**`authenticateSession` for every request** (`app.js:24`). That middleware
(`server/src/middleware/authenticateSession.js:5-22`) reads the session cookie, calls
`buildSessionContext`, and either sets `req.auth` or clears a stale cookie. It never
rejects — rejection is the job of `requireAuth`, which `routes/index.js:21` applies to
everything registered after `/auth`. `express-async-errors` (`app.js:1`) lets async
controllers throw straight into `errorHandler`
(`server/src/middleware/errorHandler.js:4-23`), which maps `ZodError` → 400,
`HttpError` → its status, everything else → 500.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/magic-link/request`
- `POST /api/auth/magic-link/consume`
- `GET /api/auth/me` (requires auth)
- `POST /api/auth/switch-tenant` (requires auth)
- `POST /api/auth/logout`

Routes: `server/src/routes/authRoutes.js:15-21`. Walkthrough of `server/src/services/authService.js`:

- **Session tokens** (`createSession`, lines 14-34): a 64-char nanoid is returned to the
  client; only its SHA-256 (`server/src/utils/crypto.js:6-8`) is stored in
  `Session.tokenHash`. A database leak therefore does not leak usable cookies.
- **Cookie** (`server/src/utils/authCookie.js:3-16`): `httpOnly`, `sameSite: 'lax'`,
  `secure` only in production, `maxAge` = `SESSION_TTL_DAYS`.
- **Session context** (`buildSessionContext`, lines 83-143): looks up an unrevoked,
  unexpired session, then re-resolves the membership and its roles' permissions **on every
  request** (lines 36-81). If the membership is no longer `ACTIVE`, the session is revoked
  on the spot (lines 109-116) — suspending a user locks them out on their next request.
  Every successful request also writes `lastUsedAt` (lines 118-121).
- **Register** (lines 170-324): one transaction creates user, tenant, membership, an
  `Owner` role with every catalog permission (222-234), a `Member` role with the five
  read permissions (236-260), the `branding` and `security` settings (269-290), and an
  `auth.register` audit row. The session and the `auth.login` audit row are written
  **after** the transaction commits (305-320).
- **Login** (lines 326-371): bcrypt compare, then pick a membership — the oldest
  `ACTIVE` one, or the one matching `tenantSlug` (`findTenantMembershipForUser`, 145-168).
- **Magic link** (lines 373-484): request always answers `{ accepted: true }`, even for
  unknown emails (382-390), so it does not reveal which emails exist. The token is stored
  hashed with a 15-minute expiry, the URL is printed to the server console (406), and — when
  `NODE_ENV !== 'production'` — **returned in the response body** (416-419), which
  `web/src/pages/LoginPage.jsx:211-214` renders as a clickable link. Consumption uses a
  guarded `updateMany ... where consumedAt: null` and checks `count === 1` (440-452), so two
  concurrent consumes cannot both mint a session.
- **Switch tenant** (lines 500-537): verifies an `ACTIVE` membership in the target tenant,
  then rewrites `Session.tenantId` in place. The cookie value does not change.

### Tenancy boundary

Protected controllers take the tenant from `req.auth.tenant.id` (for example
`server/src/controllers/usersController.js:31-35`), never from the request body or URL.
Repositories then include `tenantId` in every `where`, including on update/delete paths
that first do a `findFirst({ id, tenantId })` before writing by primary key
(`server/src/repositories/roleRepository.js:74-112`,
`server/src/repositories/userRepository.js:128-214`). Permissions are the one global
table: `Permission` has no `tenantId` (`server/prisma/schema.prisma:72-77`).

### RBAC

Policy keys (`server/src/policies/permissions.js:1-12`):

- `users.read`, `users.create`, `users.update`, `users.roles.manage`
- `roles.read`, `roles.manage`
- `permissions.read`
- `settings.read`, `settings.update`
- `audit.read`

Enforced per route by `requirePermission(key)`
(`server/src/middleware/requirePermission.js:3-15`: 401 without `req.auth`, 403
`Missing permission: <key>` otherwise). The frontend mirrors these with
`hasPermission` (`web/src/context/AuthContext.jsx:79`) to hide controls; that is UX
only — the server is the authority. `server/src/services/policyService.js` defines
`can`/`assertCan` with an extra resource-tenant check, but **nothing imports it**; all
enforcement goes through the middleware.

The catalog is upserted at server start (`server/src/index.js:6`), during registration
(`authService.js:189`) and on every `GET /api/permissions`
(`server/src/services/permissionService.js:4-7`).

### Audit logs (append-only by convention)

All writes go through `logAuditEvent` (`server/src/services/auditService.js:4-29`), which
accepts an optional transaction `client` so the audit row commits or rolls back with the
change it describes (e.g. `roleService.js:60-71`, `settingsService.js:27-39`). It silently
returns `null` if `tenantId` is missing (lines 14-16). No route updates or deletes audit
rows; the database itself does not prevent it, and `AuditLog.tenantId` is
`onDelete: Cascade` (`schema.prisma:142`).

Read endpoint (`server/src/services/auditLogService.js:5-28`): default page size **25**,
max 100, filters `action`, `resourceType`, `actorUserId`, newest first.

- `GET /api/audit-logs?page=1&pageSize=20&action=...&resourceType=...&actorUserId=...`

Actions written by the code: `auth.register`, `auth.login`, `auth.magic_link.request`,
`auth.tenant_switch`, `users.create`, `users.update`, `users.roles.update`,
`roles.create`, `roles.update`, `roles.delete`, `settings.update`. Logout is not audited.

## API Resources

| Endpoint | Permission | Notes |
| --- | --- | --- |
| `GET /api/users` | `users.read` | `search`, `status`, `roleId`, `page`, `pageSize` (default 20, `userService.js:48`) |
| `POST /api/users` | `users.create` | `email`, `name`, `password`, optional `roleIds`, `status` (`usersController.js:9-15`) |
| `PATCH /api/users/:membershipId` | `users.update` | `name` and/or `status` |
| `PUT /api/users/:membershipId/roles` | `users.roles.manage` | replaces the full role set |
| `GET /api/roles` | `roles.read` | system roles first, then by name |
| `POST /api/roles` | `roles.manage` | `name` (2-80), `description`, `permissionKeys` |
| `PATCH /api/roles/:roleId` | `roles.manage` | any of the three fields |
| `DELETE /api/roles/:roleId` | `roles.manage` | refuses system roles and roles still assigned (`roleService.js:170-176`) |
| `GET /api/permissions` | `permissions.read` | global catalog |
| `GET /api/settings` | `settings.read` | values JSON-decoded |
| `PUT /api/settings/:key` | `settings.update` | body `{ value: <any JSON> }`, upserts |
| `GET /api/audit-logs` | `audit.read` | see above |

Paginated responses are `{ data, meta: { page, pageSize, total, totalPages, hasNext, hasPrev } }`
(`server/src/utils/pagination.js:22-33`).

## Architecture Notes

- Routes/controllers: HTTP + Zod validation (`server/src/controllers/*`)
- Services: business rules, transactions, audit writes (`server/src/services/*`)
- Repositories: tenant-scoped data access (`server/src/repositories/*`)

Services sometimes reach past the repository layer to the Prisma client or transaction
directly (`authService.js` throughout, `roleService.js:152`, `userService.js:87`), so the layering is
a convention, not a boundary.

## Scripts

Root: `npm run dev` (API + web via `concurrently`), `dev:server`, `dev:web`, `build` (web),
`seed`, `format` (prettier), `lint` (stubs).
Server: `dev` (nodemon), `start`, `prisma:generate`, `db:init`, `seed`.
Web: `dev`, `build`, `preview`.

## Exercises

1. **Goal:** see the hashed-token design.
   **Check:** after logging in, the cookie value in DevTools differs from every
   `Session.tokenHash` in `server/dev.db`, and `sha256(cookie)` equals exactly one of them.
2. **Goal:** confirm suspension takes effect immediately.
   **Check:** as an Owner, `PATCH` another member to `SUSPENDED`; that member's next
   `GET /api/auth/me` returns 401 and their `Session.revokedAt` is now set
   (`authService.js:109-116`).
3. **Goal:** watch the one-time guard on magic links.
   **Check:** open a magic link in dev. React StrictMode (`web/src/main.jsx:12`) mounts the
   `MagicLinkPage` effect twice with no abort (`MagicLinkPage.jsx:12-31`), so the Network tab
   shows two `POST /api/auth/magic-link/consume` calls: one 200, one 400.
4. **Goal:** prove the audit row shares the transaction.
   **Check:** `POST /api/roles` with a `name` that already exists in the tenant. The request
   fails, and `GET /api/audit-logs?action=roles.create` shows no new row.
5. **Goal:** exercise tenant switching.
   **Check:** add your user to a second tenant, call `POST /api/auth/switch-tenant`; the cookie
   value is unchanged but `GET /api/auth/me` now reports the other `tenant.slug`.
6. **Goal:** close a gap from the review below (e.g. the system-role update guard).
   **Check:** `PATCH /api/roles/<Owner role id>` returns 400 and no `roles.update` audit row is
   written.

## Senior review (findings from reading the code)

1. **Magic-link takeover outside production.** `requestMagicLink` returns the login URL to
   whoever asked (`authService.js:416-419`) and `NODE_ENV` defaults to `development`
   (`env.js:5`). Any deployment that forgets `NODE_ENV=production` lets anyone sign in as any
   user whose email they know. Gate this on an explicit opt-in flag, not on `NODE_ENV`.
2. **`users.roles.manage` is effectively Owner.** `validateRolesForTenant`
   (`userService.js:35-45`) only checks that role ids belong to the tenant, so a holder can
   `PUT` the Owner role onto their own membership. The Member role includes `roles.read`
   (`authService.js:236-242`), so the Owner role id is visible to them.
3. **System roles can be edited.** `deleteTenantRole` refuses `isSystem` roles
   (`roleService.js:170-172`), but `updateTenantRole` (`roleService.js:93-149`) has no such
   check: a `roles.manage` holder can grant every permission to `Member`, or strip `Owner`.
4. **No last-Owner protection.** An Owner can remove their own Owner role or suspend
   themselves (`userService.js:128-200`), leaving a tenant nobody can administer.
5. **Cross-tenant write through the global `User` row.** `POST /api/users` with an email that
   already exists reuses that user (`userService.js:74-85`) and **ignores the supplied
   password** (the hash at line 71 goes unused). After that, `PATCH /api/users/:id` with
   `name` updates the global `User.name` (`userRepository.js:153-158`), which the user's other
   tenants also see. Separately, creating a user for an email nobody has registered yet means
   the creating admin chose that person's password, and their later self-registration fails
   with 409 (`authService.js:184-186`).
6. **Unique-constraint violations become 500s.** Duplicate tenant slug at registration,
   duplicate role name (`schema.prisma:68`), and the register race between the existence check
   (`authService.js:178-186`) and the insert all surface as Prisma errors, which
   `errorHandler.js:19-22` maps to 500. Map Prisma `P2002` to 409.
7. **Settings accept any key and any value.** `value: z.any()` (`settingsController.js:4-6`)
   and the free-form `:key` mean a client can create arbitrary settings rows, and the full value
   is copied into audit metadata (`settingsService.js:35-38`). Missing `value` is stored as
   `"null"`.
8. **Two schema sources of truth.** `schema.prisma` and the raw SQL in `prisma/init.js` must be
   kept in sync by hand, and `CREATE TABLE IF NOT EXISTS` never alters an existing table. The
   permission list is also duplicated (`prisma/seed.js:6-17` vs `permissions.js:14-25`).
9. **Write amplification.** Every authenticated request updates `Session.lastUsedAt`
   (`authService.js:118-121`), and every `GET /api/permissions` performs ten upserts. On SQLite
   this serializes writers under load.
10. **No rate limiting** on login or magic-link request, and no tests guard any of the
    behaviour above.
