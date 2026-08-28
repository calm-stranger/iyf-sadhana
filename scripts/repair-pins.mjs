/**
 * Re-key every account's PIN after PIN_PEPPER changed (or was lost).
 *
 * The pepper is never stored — it only lives in .env.local — so changing it makes
 * every existing PIN un-verifiable. This script keeps all accounts, profiles and
 * sadhana history intact and just resets each password to a temporary PIN using
 * the CURRENT pepper. Users then log in with the temp PIN and change it in Settings.
 *
 * Usage:
 *   node scripts/repair-pins.mjs --pin 0000            # reset everyone to 0000
 *   node scripts/repair-pins.mjs --pin 1234 --only +919876543210
 *   node scripts/repair-pins.mjs --pin 0000 --dry-run
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PIN_PEPPER from .env.local
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("Could not read .env.local — run this from the project root.");
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]?.startsWith("--") ? true : arr[i + 1] ?? true]);
    return acc;
  }, []),
);

const pin = typeof args.pin === "string" ? args.pin : null;
const only = typeof args.only === "string" ? args.only.replace(/\D/g, "") : null;
const dryRun = !!args["dry-run"];

if (!pin || !/^\d{4}$/.test(pin)) {
  console.error("Need --pin 0000 (exactly 4 digits).");
  process.exit(1);
}

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PIN_PEPPER } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PIN_PEPPER) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or PIN_PEPPER in .env.local");
  process.exit(1);
}

const password = `${PIN_PEPPER}:${pin}`;
const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let page = 1;
let done = 0;
let skipped = 0;

for (;;) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
  if (error) {
    console.error("listUsers failed:", error.message);
    process.exit(1);
  }
  if (data.users.length === 0) break;

  for (const u of data.users) {
    const digits = (u.email ?? "").split("@")[0];
    if (only && digits !== only) {
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`would reset ${u.email}`);
      done++;
      continue;
    }
    const { error: upErr } = await admin.auth.admin.updateUserById(u.id, { password });
    if (upErr) {
      console.error(`  ✗ ${u.email}: ${upErr.message}`);
    } else {
      console.log(`  ✓ ${u.email}`);
      done++;
    }
  }

  if (data.users.length < 100) break;
  page++;
}

console.log(
  `\n${dryRun ? "[dry run] " : ""}${done} account(s) ${dryRun ? "would be" : "were"} reset to PIN ${pin}` +
    (only ? ` (${skipped} skipped)` : "") +
    (dryRun ? "" : `\nTell everyone to log in with ${pin} and change their PIN in Settings.`),
);
