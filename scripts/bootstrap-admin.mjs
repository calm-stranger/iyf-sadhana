/**
 * Create the first counsellor (super_admin) — or any servant_leader — directly,
 * bypassing the /register flow (which needs a servant leader to already exist).
 *
 * Usage:
 *   node scripts/bootstrap-admin.mjs --name "Pranapati Das" --phone "+919876543210" --pin 1234
 *   node scripts/bootstrap-admin.mjs --name "Dayamay Das" --phone 9876500000 --pin 4321 --role servant_leader
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and PIN_PEPPER from .env.local
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- tiny .env.local loader ---
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("Could not read .env.local — run this from the project root.");
  process.exit(1);
}

// --- args ---
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

const name = args.name;
const pin = args.pin;
const role = args.role ?? "super_admin";
let phone = args.phone;

if (!name || !phone || !pin) {
  console.error('Need --name "Full Name" --phone +9198... --pin 1234 [--role super_admin|servant_leader]');
  process.exit(1);
}
if (!/^\d{4}$/.test(pin)) {
  console.error("PIN must be exactly 4 digits.");
  process.exit(1);
}

// normalise phone the same way src/lib/pin.ts does
phone = phone.replace(/[\s()-]/g, "");
if (/^\d{10}$/.test(phone)) phone = `+91${phone}`;
if (!/^\+\d{8,15}$/.test(phone)) {
  console.error("Phone must be E.164, e.g. +919876543210");
  process.exit(1);
}

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PIN_PEPPER } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PIN_PEPPER) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or PIN_PEPPER in .env.local");
  process.exit(1);
}

const digits = phone.replace(/\D/g, "");
const email = `${digits}@sadhana.iyf`;
const password = `${PIN_PEPPER}:${pin}`;

const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: name },
});
if (createErr) {
  console.error("createUser failed:", createErr.message);
  process.exit(1);
}

const { error: profileErr } = await admin.from("profiles").insert({
  id: created.user.id,
  role,
  status: "active",
  full_name: name,
  dob: "1990-01-01",
  whatsapp: phone,
  address: "—",
  year_joined: new Date().getFullYear(),
  rounds: 16,
  servant_leader_id: null,
  photo_url: "",
});
if (profileErr) {
  await admin.auth.admin.deleteUser(created.user.id);
  console.error("profile insert failed:", profileErr.message);
  process.exit(1);
}

console.log(`✓ ${role} created`);
console.log(`  login with WhatsApp ${phone} and PIN ${pin}`);
console.log(`  (edit dob / address later from Settings or the Supabase table editor)`);
