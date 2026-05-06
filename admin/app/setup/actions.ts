"use server";

import { cookies } from "next/headers";

import { ADMIN_SETUP_INTENT_COOKIE } from "@/lib/auth/cookies";

export type SetupVerifyState =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Validates `ADMIN_SETUP_TOKEN` and sets a short-lived cookie consumed by `/auth/callback`.
 */
export async function verifySetupToken(
  _prev: SetupVerifyState | undefined,
  formData: FormData,
): Promise<SetupVerifyState> {
  const token = formData.get("token")?.toString().trim() ?? "";
  const expected = process.env.ADMIN_SETUP_TOKEN;

  if (!expected) {
    return { ok: false, message: "ADMIN_SETUP_TOKEN is not configured on the server." };
  }

  if (token !== expected) {
    return { ok: false, message: "Invalid setup token." };
  }

  const jar = await cookies();
  jar.set(ADMIN_SETUP_INTENT_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });

  return { ok: true };
}
