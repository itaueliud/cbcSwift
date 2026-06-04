# CBCNexus API

Node.js + Prisma backend for CBCNexus.

## Run locally

```bash
cd apps/api
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## Main endpoints

- `POST /auth/hq/login`
- `POST /auth/school/login`
- `GET /auth/me`
- `GET /hq/stats`
- `GET /school/overview`
- `GET /school/features`
- `GET /principal/analytics`
- `GET /teacher/dashboard-stats`
- `GET /teacher/my-classes`
- `GET /teacher/my-subjects`
- `GET /student/dashboard`
- `GET /student/portfolio`
- `GET /parent/dashboard`
- `GET /finance/dashboard`

