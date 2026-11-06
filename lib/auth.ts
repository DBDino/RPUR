import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export const SESSION_COOKIE = "rpur_session";
export const DEMO_PASSWORD = "password123";

export const DEMO_ACCOUNTS: { email: string; role: UserRole; label: string }[] = [
  { email: "admin@unpad.ac.id", role: "ADMIN", label: "Administrator Sarpras" },
  { email: "kaprodi@unpad.ac.id", role: "KAPRODI", label: "Kaprodi" },
  { email: "sarpras@unpad.ac.id", role: "SARPRAS", label: "Pengelola Sarpras Fakultas" },
];

function secret() {
  return process.env.AUTH_SECRET || "rpur-development-session-secret-change-on-production";
}

export function signSession(email: string, role: UserRole) {
  const payload = Buffer.from(JSON.stringify({ email, role, exp: Date.now() + 12 * 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export async function verifySession(): Promise<{ id: string; email: string; name: string; role: UserRole } | null> {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string; exp?: number };
    if (!data.email || !data.exp || data.exp < Date.now()) return null;
    return prisma.user.findUnique({ where: { email: data.email } });
  } catch {
    return null;
  }
}
