import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { verifySession } from "@/lib/auth";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPUR | Tata Kelola Ruang",
  description: "Dashboard roster perkuliahan dan utilisasi ruangan",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-next-pathname") || "";
  const user = await verifySession();
  if (pathname === "/login") return <html lang="id"><body>{children}</body></html>;
  if (!user) return <html lang="id"><body>{children}</body></html>;
  return (
    <html lang="id">
      <body>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
