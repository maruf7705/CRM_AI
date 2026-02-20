# Backup and Recovery Runbook

This project uses Supabase PostgreSQL. Backups are managed with PostgreSQL client tools (`pg_dump`, `pg_restore`) and the scripts in `scripts/`.

## Prerequisites

1. Install PostgreSQL client tools so `pg_dump` and `pg_restore` are available in your PATH.
2. Export one database URL:
   - Prefer `DIRECT_URL`
   - Fallback `DATABASE_URL`

## Create Backup

From repository root:

```bash
npm run backup:create
```

The script writes a custom-format dump to `backups/omnidesk-<timestamp>.dump`.

## Verify Backup

```bash
npm run backup:verify -- backups/omnidesk-<timestamp>.dump
```

This checks dump integrity by listing restore metadata.

## Restore Backup

Warning: restore uses `--clean --if-exists` and will replace existing objects.

```bash
npm run backup:restore -- backups/omnidesk-<timestamp>.dump
```

## Incident Procedure

1. Detect incident and freeze schema-changing deploys.
2. Capture current failing state:
   - Save Railway logs
   - Save latest successful dump filename
3. Restore dump to a safe target first (recommended: staging database).
4. Validate:
   - `GET /api/v1/health`
   - Critical tables row counts
   - Login and message send flow
5. If valid, restore to production.
6. Rotate secrets exposed during incident handling.
7. Record timeline, root cause, and prevention action.

## Recommended Cadence

1. Daily backup in production.
2. Weekly restore drill into staging.
3. Monthly full incident simulation.
