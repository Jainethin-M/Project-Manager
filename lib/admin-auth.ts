import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "devvault_admin_session";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getAdminPassword() {
  const password = process.env.DEVVAULT_SECRET_PASSWORD?.trim() || "";
  if (!password) {
    throw new Error("DEVVAULT_SECRET_PASSWORD must be set in .env.");
  }
  return password;
}

export function isValidAdminPassword(candidate: string) {
  const expected = Buffer.from(getAdminPassword(), "utf8");
  const received = Buffer.from(candidate.trim(), "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

function getAdminSessionValue() {
  return sha256(`${getAdminPassword()}:devvault-admin`);
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value === getAdminSessionValue();
}

export async function setAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, getAdminSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
