#!/usr/bin/env node

const required = ["BACKEND_URL", "FRONTEND_URL"];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const backendUrl = process.env.BACKEND_URL.replace(/\/+$/, "");
const frontendUrl = process.env.FRONTEND_URL.replace(/\/+$/, "");

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const check = async (name, url, validator) => {
  try {
    const response = await fetch(url, { redirect: "manual" });
    const ok = await validator(response);
    if (!ok) {
      fail(`[FAIL] ${name}: ${response.status} ${response.statusText}`);
    }
    console.log(`[PASS] ${name}`);
  } catch (error) {
    fail(`[FAIL] ${name}: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

await check("Backend health endpoint", `${backendUrl}/api/v1/health`, async (response) => {
  if (response.status !== 200) {
    return false;
  }

  const body = await response.json();
  return Boolean(body?.success) && body?.data?.status === "ok";
});

await check("Backend webhook endpoint", `${backendUrl}/api/v1/webhooks/facebook`, async (response) => {
  return response.status === 403 || response.status === 400 || response.status === 200;
});

await check("Frontend root", `${frontendUrl}/`, async (response) => response.status === 200);

console.log("\nManual production checks:");
console.log("1. Login on frontend and open Inbox on two browsers.");
console.log("2. Send a message from browser A and verify live render in browser B (Supabase Realtime).");
console.log("3. Trigger inbound webhook from Meta test console and verify message appears in Inbox.");
console.log("4. Trigger AI reply flow and verify callback reaches /api/v1/webhooks/n8n-callback.");
console.log("5. Confirm channel webhook URLs point to the deployed backend domain.");
