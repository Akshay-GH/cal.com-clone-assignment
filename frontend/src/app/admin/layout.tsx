import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Admin Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-semibold">
                Cal Clone Workspace
              </h1>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Link className="btn-secondary text-sm" href="/admin/events">
                Event Types
              </Link>
              <Link
                className="btn-secondary text-sm"
                href="/admin/availability"
              >
                Availability
              </Link>
              <Link className="btn-secondary text-sm" href="/admin/bookings">
                Bookings
              </Link>
              <Link className="btn-secondary text-sm" href="/demo-user">
                Public Page
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
