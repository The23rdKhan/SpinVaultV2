#!/usr/bin/env node
/**
 * Creates a Supabase Auth user (email + password) and grants an `admin` schema role.
 *
 * Loads env files (later files override earlier):
 *   1. ../mobile/.env
 *   2. ../mobile/.env.local
 *   3. admin/.env
 *   4. admin/.env.local
 *
 * Maps Expo-style vars if Next-style URL is missing:
 *   EXPO_PUBLIC_SUPABASE_URL → NEXT_PUBLIC_SUPABASE_URL
 *
 * Creating users requires SUPABASE_SERVICE_ROLE_KEY — this is never in the mobile app.
 * Copy it from Supabase Dashboard → Settings → API → service_role (secret) into admin/.env.local.
 *
 * Usage:
 *   npm run create-admin -- <email> <password> [role]
 *   CREATE_ADMIN_PASSWORD='…' npm run create-admin -- <email> [role]
 *
 * Roles (default: super_admin): super_admin | content_manager | qa_reviewer |
 *   legal_compliance | economy_manager | artist_designer
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminRoot = resolve(__dirname, "..");
const repoRoot = resolve(adminRoot, "..");

const ROLES = [
  "super_admin",
  "content_manager",
  "qa_reviewer",
  "legal_compliance",
  "economy_manager",
  "artist_designer",
];

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) {
    return;
  }
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

/** Repo-relative env for CLI (mobile first, then admin overrides). */
function loadAllEnvFiles() {
  loadEnvFile(resolve(repoRoot, "mobile", ".env"));
  loadEnvFile(resolve(repoRoot, "mobile", ".env.local"));
  loadEnvFile(resolve(adminRoot, ".env"));
  loadEnvFile(resolve(adminRoot, ".env.local"));
}

function applyMobileToAdminAliases() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  }
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    (process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  }
}

loadAllEnvFiles();
applyMobileToAdminAliases();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const argv = process.argv.slice(2);
const email = argv[0];

let password;
let role;

if (process.env.CREATE_ADMIN_PASSWORD) {
  password = process.env.CREATE_ADMIN_PASSWORD;
  role = argv[1] ?? "super_admin";
} else {
  password = argv[1];
  role = argv[2] ?? "super_admin";
}

if (!email || !password) {
  console.error(`
Usage:
  npm run create-admin -- <email> <password> [role]
  CREATE_ADMIN_PASSWORD='your-password' npm run create-admin -- <email> [role]

Environment:
  SUPABASE_SERVICE_ROLE_KEY — required (Supabase Dashboard → Settings → API → service_role).
  NEXT_PUBLIC_SUPABASE_URL — admin/.env.local, or copy from mobile/.env as EXPO_PUBLIC_SUPABASE_URL.
`);
  process.exit(1);
}

if (!url || !serviceKey) {
  console.error("Missing required env for create-admin:\n");
  if (!url) {
    console.error(
      "  NEXT_PUBLIC_SUPABASE_URL — set in admin/.env.local, or add EXPO_PUBLIC_SUPABASE_URL to mobile/.env",
    );
  }
  if (!serviceKey) {
    const envLocal = resolve(adminRoot, ".env.local");
    const envFile = resolve(adminRoot, ".env");
    console.error(
      "  SUPABASE_SERVICE_ROLE_KEY — not loaded from disk or shell.",
    );
    console.error(
      "    It only exists in Supabase Dashboard → Settings → API → service_role (secret).",
    );
    console.error(
      `    Add one line to ${envLocal}:\n      SUPABASE_SERVICE_ROLE_KEY=paste_key_here\n`,
    );
    console.error(
      `    Env files present: admin/.env=${existsSync(envFile)}, admin/.env.local=${existsSync(envLocal)}.`,
    );
    console.error(
      "\n    One-off (no file edit):\n      SUPABASE_SERVICE_ROLE_KEY='your_secret' npm run create-admin -- <email> <password>\n",
    );
  }
  process.exit(1);
}

if (!ROLES.includes(role)) {
  console.error(`Invalid role "${role}". Choose one of: ${ROLES.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const admin = supabase.schema("admin");

const { data: created, error: authErr } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (authErr) {
  console.error("Auth:", authErr.message);
  process.exit(1);
}

const userId = created.user.id;

const { error: userErr } = await admin.from("admin_users").upsert(
  {
    id: userId,
    email,
    display_name: null,
  },
  { onConflict: "id" },
);

if (userErr) {
  console.error("admin_users:", userErr.message);
  process.exit(1);
}

const { error: roleErr } = await admin.from("admin_roles").upsert(
  {
    user_id: userId,
    role,
    granted_by: null,
  },
  { onConflict: "user_id,role" },
);

if (roleErr) {
  console.error("admin_roles:", roleErr.message);
  process.exit(1);
}

if (role === "super_admin") {
  const { data: boot } = await admin
    .from("bootstrap_state")
    .select("completed_at")
    .eq("id", 1)
    .maybeSingle();

  if (!boot?.completed_at) {
    const { error: bootErr } = await admin
      .from("bootstrap_state")
      .update({
        completed_at: new Date().toISOString(),
        completed_by: userId,
      })
      .eq("id", 1);

    if (bootErr) {
      console.warn("bootstrap_state update:", bootErr.message);
    } else {
      console.log("Marked one-time bootstrap as completed (first super_admin).");
    }
  }
}

console.log(`Created admin user ${email} with role ${role}.`);
console.log("Sign in at /login with email and password.");
