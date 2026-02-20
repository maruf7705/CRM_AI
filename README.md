# OmniDesk AI CRM

Docker-free omnichannel AI CRM monorepo.

## Stack
- Frontend: Next.js 14, TypeScript, Tailwind, TanStack Query, Zustand, Supabase Realtime
- Backend: Node.js 20, Express, TypeScript, Prisma, Supabase Postgres, Upstash Redis
- AI: n8n webhook orchestration with OpenAI fallback

## Project Layout
- `frontend` -> Next.js app (Vercel target)
- `backend` -> Express API (Railway target)

## Prerequisites
- Node.js 20+
- npm 10+
- Supabase project
- Upstash Redis

## Local Setup
1. Install root dependencies:
   ```bash
   npm install
   ```
2. Backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npx prisma generate
   npx prisma migrate dev
   npm run prisma:seed
   npm run dev
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local
   npm run dev
   ```

## One-command local dev
From repo root:
```bash
npm run dev
```

## Health Check
- Liveness (for Railway deploy): `GET http://localhost:4000/api/v1/health/live`
- Readiness (checks DB/Redis/Supabase): `GET http://localhost:4000/api/v1/health`

## Deployment
- Frontend -> Vercel (`frontend` root)
- Backend -> Railway (`backend` root)
- Database/Realtime -> Supabase
- Cache -> Upstash Redis

## Phase 10 Deployment Artifacts
- Railway config: `backend/railway.json`
- Railway Procfile fallback: `backend/Procfile`
- Vercel config: `frontend/vercel.json`
- Runbook: `DEPLOYMENT.md`
- Production smoke script:
  ```bash
  BACKEND_URL=https://<railway-domain> FRONTEND_URL=https://<vercel-domain> npm run verify:production
  ```
