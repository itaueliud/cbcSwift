# CBCNexus

CBCNexus scaffold for a multi-tenant Kenyan education SaaS platform.

## Architecture highlights

- PostgreSQL with UUID primary keys, tenant isolation, audit logs, and event tables.
- Multi-tenant RBAC plus feature flags and workflow approvals.
- Payment intent flow for M-Pesa: intent → STK push → webhook → receipt → notification → analytics.
- Notifications are unified across dashboards in `/notifications`.

## Project layout

- `apps/api/` contains the Node.js + Prisma backend.
- `web/` contains the Next.js + TypeScript frontend.
- `docker-compose.yml` and `nginx/` provide local container and edge-proxy wiring.

## Run backend

```bash
cd apps/api
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## Run web

```bash
cd web
npm install
npm run dev
```

## Run containers

```bash
docker compose up --build
```

## Demo credentials

- HQ Super Admin: `admin@techswifttrix.com` / `Admin@2025!`
- School Admin: `admin@greenvalley.ac.ke` / `School@2025!`
- Principal: `principal@greenvalley.ac.ke` / `Principal@2025!`
- Teacher: `teacher1@greenvalley.ac.ke` / `Teacher@2025!`
- Student: `adm001@greenvalley.ac.ke` / `Student@2025!`
- Parent: `parent1@greenvalley.ac.ke` / `Parent@2025!`
- Finance: `finance@greenvalley.ac.ke` / `Finance@2025!`

## Main endpoints

- `POST /auth/hq/login`
- `POST /auth/school/login`
- `GET /auth/matrix`
- `GET /notifications`
- `GET /audit-logs`
- `GET /hq/stats`
- `GET /school/overview`
- `GET /teacher/dashboard-stats`
- `GET /student/dashboard`
- `GET /parent/dashboard`
- `GET /finance/dashboard`
- `GET /finance/payment-intents`
- `POST /finance/mpesa/stk-push`
- `GET /school/timetable`
- `GET /school/messages`
- `GET /principal/reports`
