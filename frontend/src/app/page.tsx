import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen px-6 py-16">
      <main className="mx-auto max-w-5xl rounded-3xl border border-border bg-surface p-8 shadow-sm sm:p-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Cal Clone Assignment
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          Scheduling platform with event types, availability, and booking flow
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          This implementation replicates Cal.com style interactions for admin
          management and public booking.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/events"
            className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
              Admin
            </p>
            <h2 className="mt-2 text-xl font-semibold">Manage event types</h2>
            <p className="mt-2 text-sm text-muted">
              Create, update, and remove event types with custom durations.
            </p>
          </Link>

          <Link
            href="/demo-user"
            className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
              Public
            </p>
            <h2 className="mt-2 text-xl font-semibold">Open booking page</h2>
            <p className="mt-2 text-sm text-muted">
              Pick an event, choose a slot, and submit a booking request.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
