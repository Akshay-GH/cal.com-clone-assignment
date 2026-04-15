"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Booking = {
  id: number;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  startAt: string;
  endAt: string;
  status: "confirmed" | "cancelled";
  eventTitle: string;
};

function BookingCardSkeleton({ label }: { label?: string }) {
  return (
    <article className="rounded-xl border border-border p-4">
      <div className="animate-pulse">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="h-4 w-44 rounded bg-slate-200" />
            <div className="h-3 w-64 rounded bg-slate-200" />
            <div className="h-3 w-48 rounded bg-slate-200" />
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
            <div className="h-6 w-20 rounded-full bg-slate-200" />
            <div className="h-8 w-20 rounded-lg bg-slate-200" />
          </div>
        </div>
      </div>
      {label ? <p className="mt-3 text-xs text-muted">{label}</p> : null}
    </article>
  );
}

export default function BookingsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(type: "upcoming" | "past") {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Booking[] }>(
        `/api/admin/bookings?type=${type}`,
      );
      setBookings(res.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(tab);
  }, [tab]);

  async function cancelBooking(id: number) {
    if (!confirm("Cancel this booking?")) return;
    setCancellingId(id);
    try {
      await apiFetch(`/api/admin/bookings/${id}/cancel`, { method: "PATCH" });
      await load(tab);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Bookings</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-secondary text-sm"
            onClick={() => setTab("upcoming")}
            disabled={loading}
          >
            Upcoming
          </button>
          <button
            className="btn-secondary text-sm"
            onClick={() => setTab("past")}
            disabled={loading}
          >
            Past
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <BookingCardSkeleton key={`booking-skeleton-${index}`} />
            ))
          : null}
        {bookings.map((item) =>
          cancellingId === item.id ? (
            <BookingCardSkeleton key={item.id} label="Cancelling booking..." />
          ) : (
            <article
              key={item.id}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{item.eventTitle}</h3>
                  <p className="text-sm text-muted">
                    {new Date(item.startAt).toLocaleString()} -{" "}
                    {new Date(item.endAt).toLocaleTimeString()}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {item.guestName} • {item.guestEmail}
                  </p>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                  <span className="rounded-full bg-surface-soft px-2.5 py-1 text-xs uppercase tracking-wide text-muted">
                    {item.status}
                  </span>
                  {item.status === "confirmed" && tab === "upcoming" ? (
                    <button
                      className="btn-secondary text-sm"
                      onClick={() => cancelBooking(item.id)}
                      disabled={cancellingId !== null}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ),
        )}
      </div>

      {!loading && bookings.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No bookings found.</p>
      ) : null}
    </section>
  );
}
