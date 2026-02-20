#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const input = process.argv[2];

if (!databaseUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL environment variable.");
  process.exit(1);
}

if (!input) {
  console.error("Usage: npm run backup:restore -- <path-to-dump>");
  process.exit(1);
}

const dumpPath = resolve(process.cwd(), input);
if (!existsSync(dumpPath)) {
  console.error(`Dump file not found: ${dumpPath}`);
  process.exit(1);
}

console.log(`Restoring dump: ${dumpPath}`);

const args = [
  "--clean",
  "--if-exists",
  "--no-owner",
  "--no-privileges",
  `--dbname=${databaseUrl}`,
  dumpPath,
];

const result = spawnSync("pg_restore", args, {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  if (result.error.message.includes("ENOENT")) {
    console.error("pg_restore not found. Install PostgreSQL client tools and retry.");
  } else {
    console.error(`Restore failed: ${result.error.message}`);
  }
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`Restore failed with exit code ${result.status}.`);
  process.exit(result.status ?? 1);
}

console.log("Restore completed.");
