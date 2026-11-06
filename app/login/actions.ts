"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_PASSWORD, SESSION_COOKIE, signSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || password !== DEMO_PASSWORD) redirect("/login?error=Email+atau+password+tidak+sesuai.");
  (await cookies()).set(SESSION_COOKIE, signSession(user.email, user.role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
