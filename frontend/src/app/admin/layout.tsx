"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/events", label: "Event Types" },
    { href: "/admin/availability", label: "Availability" },
    { href: "/admin/bookings", label: "Bookings" },
    { href: "/demo-user", label: "Public Page" },
  ];

  function isActive(href: string) {
    if (href === "/demo-user") {
      return pathname.startsWith("/demo-user");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:flex-row md:gap-6">
        <aside className="card md:w-64 md:flex-none md:self-start md:sticky md:top-6">
          <div className="p-4 sm:p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Admin Dashboard
            </p>
            <h1 className="mt-1 text-xl font-semibold">Cal Clone Workspace</h1>
          </div>

          <nav className="border-t border-border p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-col">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl border px-3 py-2 text-center text-sm font-medium transition md:text-left ${
                    isActive(item.href)
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-surface-soft hover:bg-surface"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
