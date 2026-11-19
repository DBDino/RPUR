"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { can, type Resource } from "@/lib/rbac";
import { useState } from "react";

const navigation = [
  { href: "/", label: "Ringkasan", code: "01", icon: "overview", exact: true, resource: "dashboard" },
  { href: "/rooms", label: "Inventaris Ruang", code: "02", icon: "rooms", resource: "rooms" },
  { href: "/schedules", label: "Master Jadwal", code: "03", icon: "calendar", resource: "schedules" },
  { href: "/tickets", label: "Permintaan Ruang", code: "04", icon: "ticket", resource: "tickets" },
  { href: "/analytics", label: "Analitik Utilisasi", code: "05", icon: "analytics", resource: "analytics" },
  { href: "/improvements", label: "Tiket Perbaikan", code: "06", icon: "improvement", resource: "improvements" },
  { href: "/conflicts", label: "Peninjauan Bentrok", code: "07", icon: "conflict", resource: "conflicts" },
  { href: "/users", label: "Pengguna", code: "08", icon: "overview", resource: "users" },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    rooms: <><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" /><path d="M9 21v-6h6v6M8 7h8M8 11h8" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" /></>,
    ticket: <><path d="M3 7v2a3 3 0 0 0 0 6v2h18v-2a3 3 0 0 0 0-6V7H3Z" /><path d="M13 7v10" /></>,
    analytics: <><path d="M4 20V10M10 20V4M16 20v-7M22 20V7" /></>,
    improvement: <><path d="M12 20v-9M12 7V4M4 20V10M20 20v-5M2 20h20" /></>,
    conflict: <><path d="M12 3 2 21h20L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export function AppShell({ children, user }: { children: React.ReactNode; user: { name: string; role: UserRole; faculty: string | null } }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileDrawerOpen(false);
  }

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileDrawerOpen((prev) => !prev);
    } else {
      const next = !collapsed;
      setCollapsed(next);
      window.localStorage.setItem("rpur-sidebar", next ? "collapsed" : "expanded");
    }
  }

  return (
    <div className={`app-shell${collapsed ? " sidebar-collapsed" : ""}${mobileDrawerOpen ? " mobile-drawer-open" : ""}`}>
      <header className="app-topbar">
        <div className="app-topbar-leading">
          <button
            className="sidebar-menu-toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label="Alihkan navigasi"
            aria-controls="primary-navigation"
            aria-expanded={mobileDrawerOpen || !collapsed}
            title="Alihkan navigasi"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="app-topbar-brand" aria-label="Beranda">
            <Image
              className="app-topbar-logo"
              src="/images/header-unpad.svg"
              alt="Logo Universitas Padjadjaran"
              width={220}
              height={55}
              priority
            />
            <span><strong>RPUR</strong><small>Campus Operations</small></span>
          </Link>
        </div>
        <div className="app-topbar-actions">
          <div className="topbar-user">
            <span className="topbar-avatar">{user.name.charAt(0).toUpperCase()}</span>
            <span className="topbar-user-details">
              <strong>{user.name}</strong>
              <small>{user.role}{user.faculty ? ` · ${user.faculty}` : ""}</small>
            </span>
          </div>
          <form action="/api/logout" method="post" className="logout-form">
            <button type="submit" aria-label="Keluar" title="Keluar">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13 4H5v16h8" />
                <path d="M10 12h10m-4-4 4 4-4 4" />
              </svg>
            </button>
          </form>
        </div>
      </header>
      <div className="app-layout">
        {mobileDrawerOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside className="sidebar" id="primary-navigation">
          <div className="sidebar-label">Ruang operasional</div>
          <nav className="sidebar-nav" aria-label="Navigasi utama">
            {navigation.map((item, index) => {
              const active = item.exact ? pathname === "/" : pathname.startsWith(item.href);
              if (!can(user.role, item.resource as Resource)) return null;
              return (
                <Link
                  key={`${item.label}-${index}`}
                  href={item.href}
                  className={active ? "nav-item active" : "nav-item"}
                  onClick={() => setMobileDrawerOpen(false)}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="workspace">
          {children}
          <footer className="app-footer">
            <Image
              src="/images/footer-unpad.svg"
              alt="Universitas Padjadjaran"
              width={570}
              height={142}
            />
            <p>© 2026 Universitas Padjadjaran. Seluruh hak cipta dilindungi.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
