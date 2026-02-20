# OmniDesk AI Deployment Runbook (Phase 10)

This project is Docker-free and deploys with native Node builds.

## 1. Deploy Backend to Railway  

1. Create a new Railway project.
2. Connect the repository and set root directory to `backend`.
3. Railway will use:
   - `backend/railway.json` build command: `npm run build`
   - start command: `npm run start`
   - healthcheck: `/api/v1/health/live`
4. Add all backend env vars from `backend/.env.example`.
   - Optional observability: set `SENTRY_DSN` to enable error tracking.
   - If you use Vercel preview URLs, set `CORS_ALLOWED_ORIGINS` as comma-separated origins.
5. Set `FRONTEND_URL` to your Vercel production domain.
6. Set `NODE_ENV=production`.
7. Run migrations against production DB:
   - use Railway shell or one-off command: `npm run prisma:migrate:deploy`
8. Note your backend URL, for example:
   - `https://omnidesk-api.up.railway.app`

## 2. Deploy Frontend to Vercel

1. Create a Vercel project.
2. Connect the repository and set root directory to `frontend`.
3. Vercel reads `frontend/vercel.json` for build settings and security headers.
4. Set frontend env vars:
   - `NEXT_PUBLIC_API_URL=https://<railway-domain>/api/v1`
   - `NEXT_PUBLIC_APP_URL=https://<vercel-domain>`
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
5. Deploy and note your frontend URL.

## 3. Post-Deploy URL Updates

1. Update Railway `FRONTEND_URL` to exact Vercel domain.
   - Example: `https://crm-ai-one.vercel.app`
   - Optional previews: `CORS_ALLOWED_ORIGINS=https://crm-ai-one-git-main-<team>.vercel.app,https://crm-ai-one-<branch>-<team>.vercel.app`
2. Update n8n callback target to:
   - `https://<railway-domain>/api/v1/webhooks/n8n-callback`
3. Update Meta webhook callback URLs:
   - Facebook: `https://<railway-domain>/api/v1/webhooks/facebook`
   - Instagram: `https://<railway-domain>/api/v1/webhooks/instagram`
   - WhatsApp: `https://<railway-domain>/api/v1/webhooks/whatsapp`

## 4. Automated Smoke Check

From repo root:

```bash
BACKEND_URL=https://<railway-domain> FRONTEND_URL=https://<vercel-domain> npm run verify:production
```

This validates:
- backend liveness endpoint
- webhook endpoint reachability
- frontend root reachability

## 5. Manual Production Validation

1. Authentication: register/login/refresh/logout flow.
2. Realtime: open Inbox in two clients and verify instant updates.
3. Webhooks: send provider test events and verify conversation/message creation.
4. AI flow: inbound message -> AI processing -> callback -> outbound message.
5. Analytics and contacts pages load with production data.

## 6. Backup and Recovery

1. Backup runbook: `BACKUP_RECOVERY.md`
2. Create backup from repo root:
   - `npm run backup:create`
3. Verify dump file:
   - `npm run backup:verify -- backups/<file>.dump`
