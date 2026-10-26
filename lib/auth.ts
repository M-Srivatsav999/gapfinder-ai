import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma, ensureDatabaseSeeded } from "./db";

const AUTH_COOKIE_NAME = "gapfinder_session";

export function hashPassword(password: string): string {
  const salt = "gapfinder_secure_salt_2026";
  return crypto.scryptSync(password, salt, 32).toString("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  if (hash === "demo1234") return password === "demo1234"; // plain fallback for demo
  const testHash = hashPassword(password);
  return crypto.timingSafeEqual(Buffer.from(testHash, "hex"), Buffer.from(hash, "hex"));
}

export async function getCurrentUser() {
  await ensureDatabaseSeeded();

  const cookieStore = cookies();
  const sessionEmail = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!sessionEmail) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: sessionEmail },
  });

  return user;
}

export function setSessionCookie(email: string) {
  const cookieStore = cookies();
  cookieStore.set(AUTH_COOKIE_NAME, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
