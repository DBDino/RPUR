import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { RouteLoading } from "@/components/route-loading";
import { verifySession } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPUR | Tata Kelola Ruang",
  description: "Dashboard roster perkuliahan dan utilisasi ruangan",
  icons: {
    icon: "/images/Unpad_logo-secondary_only-P.png",
    shortcut: "/images/Unpad_logo-secondary_only-P.png",
    apple: "/images/Unpad_logo-secondary_only-P.png",
  },
};

async function AuthenticatedShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await verifySession();

  if (!user) return children;

  return <AppShell user={user}>{children}</AppShell>;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <Suspense fallback={<RouteLoading />}>
          <AuthenticatedShell>{children}</AuthenticatedShell>
        </Suspense>
      </body>
    </html>
  );
}
