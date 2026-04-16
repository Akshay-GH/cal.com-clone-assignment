import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#1e293b_0%,#09090b_45%,#09090b_100%)] px-6 py-16">
      <main className="mx-auto max-w-5xl rounded-3xl border border-border bg-surface/90 p-8 shadow-sm backdrop-blur sm:p-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Cal Clone Assignment
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          Stop emailing. Start scheduling.
        </h1>
        <p className="mt-4 max-w-3xl text-muted">
          Share your availability, get booked in seconds, and never worry about
          double-bookings again. Built for fast, hassle-free scheduling.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-sm text-muted">
          <span className="rounded-full border border-border bg-surface-soft px-3 py-1">
            Event Types
          </span>
          <span className="rounded-full border border-border bg-surface-soft px-3 py-1">
            Availability
          </span>
          <span className="rounded-full border border-border bg-surface-soft px-3 py-1">
            Date Overrides
          </span>
          <span className="rounded-full border border-border bg-surface-soft px-3 py-1">
            Booking Flow
          </span>
        </div>

        <div className="mt-10">
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-3 rounded-2xl bg-zinc-800 px-6 py-3 text-lg font-semibold text-white transition hover:bg-zinc-700"
          >
            Go to app
            <span aria-hidden className="text-xl leading-none">
              ›
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
