# Multi-tenant SaaS Admin (RBAC + Audit Logs)

Production-style full-stack JavaScript app for tenant-scoped admin operations:

- Email/password auth + magic-link auth
- Strict tenant boundary on every data path
- Role-based access control (RBAC) with policy enforcement
- Immutable audit log (`who did what, when`)
- Admin UI with server-side pagination and filtering

## Stack

- Backend: Node.js, Express, Prisma Client, SQLite
- Frontend: React, Vite, React Router, TanStack Query
- Validation: Zod

## Project Layout

- `server`: API, auth/session, RBAC policy checks, tenant-scoped services, audit logging
- `web`: admin UI for users/roles/settings/audit log management

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure env files:

```bash
copy server\.env.example server\.env
copy web\.env.example web\.env
```

3. Generate Prisma client + initialize DB + seed permissions:

```bash
npm run prisma:generate -w server
npm run seed -w server
```

4. Start both backend and frontend:

```bash
npm run dev
```

- API: `http://localhost:4000/api`
- Web: `http://localhost:5173`

## Core Modules

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/magic-link/request`
- `POST /api/auth/magic-link/consume`
- `GET /api/auth/me`
- `POST /api/auth/switch-tenant`
- `POST /api/auth/logout`

Session cookie is HTTP-only and tenant-aware.

### Tenancy Boundary

All protected routes derive tenant scope from authenticated session context (`req.auth.tenant.id`) and pass it through repository/service filters.

### RBAC

Policy keys:

- `users.read`
- `users.create`
- `users.update`
- `users.roles.manage`
- `roles.read`
- `roles.manage`
- `permissions.read`
- `settings.read`
- `settings.update`
- `audit.read`

Enforced by backend middleware (`requirePermission`) and mirrored in frontend visibility controls.

### Audit Logs (Immutable)

Write-only through `logAuditEvent` service. No update/delete endpoints are exposed.

Read endpoint:

- `GET /api/audit-logs?page=1&pageSize=20&action=...&resourceType=...`

## API Resources

- Users: `GET/POST /api/users`, `PATCH /api/users/:membershipId`, `PUT /api/users/:membershipId/roles`
- Roles: `GET/POST /api/roles`, `PATCH /api/roles/:roleId`, `DELETE /api/roles/:roleId`
- Permissions: `GET /api/permissions`
- Settings: `GET /api/settings`, `PUT /api/settings/:key`
- Audit logs: `GET /api/audit-logs`

## Architecture Notes

Backend layers are separated:

- Routes/controllers: HTTP + request validation
- Services: business logic, permission-sensitive operations, audit writes
- Repositories: tenant-scoped data access

This separation keeps policy logic and persistence concerns decoupled from HTTP handlers.

## Scripts

Root:

- `npm run dev` (run API + web)
- `npm run dev:server`
- `npm run dev:web`
- `npm run build` (web)

Server:

- `npm run prisma:generate`
- `npm run db:init` (SQL schema bootstrap)
- `npm run seed`

Web:

- `npm run dev`
- `npm run build`
- `npm run preview`
