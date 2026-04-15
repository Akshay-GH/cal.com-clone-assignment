import Link from "next/link";

function EventTypeSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border p-4">
      <div className="h-6 w-48 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-28 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-full rounded bg-slate-200" />
    </div>
  );
}

export default function LoadingHostPage() {
  return (
    <main className="mx-auto my-8 max-w-4xl px-4 sm:px-6">
      <section className="card p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Public Booking
          </p>
          <Link href="/admin/events" className="btn-secondary text-sm">
            Home
          </Link>
        </div>

        <div className="mt-2 h-9 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-52 animate-pulse rounded bg-slate-200" />

        <div className="mt-6 grid gap-3">
          <EventTypeSkeleton />
          <EventTypeSkeleton />
          <EventTypeSkeleton />
        </div>
      </section>
    </main>
  );
}
