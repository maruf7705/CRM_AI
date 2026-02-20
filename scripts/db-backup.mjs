#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL environment variable.");
  process.exit(1);
}

const backupDir = resolve(process.cwd(), "backups");
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = resolve(backupDir, `omnidesk-${timestamp}.dump`);

const args = [
  "--format=custom",
  "--no-owner",
  "--no-privileges",
  `--file=${outputPath}`,
  databaseUrl,
];

console.log(`Creating backup at ${outputPath}`);

const result = spawnSync("pg_dump", args, {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  if (result.error.message.includes("ENOENT")) {
    console.error("pg_dump not found. Install PostgreSQL client tools and retry.");
  } else {
    console.error(`Backup failed: ${result.error.message}`);
  }
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`Backup failed with exit code ${result.status}.`);
  process.exit(result.status ?? 1);
}

console.log("Backup completed successfully.");
console.log(outputPath);
