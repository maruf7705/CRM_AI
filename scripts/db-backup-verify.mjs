#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const input = process.argv[2];

if (!input) {
  console.error("Usage: npm run backup:verify -- <path-to-dump>");
  process.exit(1);
}

const dumpPath = resolve(process.cwd(), input);
if (!existsSync(dumpPath)) {
  console.error(`Dump file not found: ${dumpPath}`);
  process.exit(1);
}

console.log(`Verifying dump: ${dumpPath}`);

const result = spawnSync("pg_restore", ["--list", dumpPath], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  if (result.error.message.includes("ENOENT")) {
    console.error("pg_restore not found. Install PostgreSQL client tools and retry.");
  } else {
    console.error(`Verification failed: ${result.error.message}`);
  }
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`Verification failed with exit code ${result.status}.`);
  process.exit(result.status ?? 1);
}

console.log("Verification passed.");
