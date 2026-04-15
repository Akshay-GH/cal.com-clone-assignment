"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";

type Props = {
  params: Promise<{ id: string }>;
};

type Booking = {
  id: number;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  startAt: string;
  endAt: string;
  status: string;
  eventTitle: string;
  hostName: string;
};

function BookingDetailsSkeleton() {
  return (
    <main className="mx-auto my-10 max-w-2xl px-4 sm:px-6">
      <section className="card animate-pulse p-6 sm:p-8">
        <div className="h-3 w-32 rounded bg-slate-200" />
        <div className="mt-3 h-9 w-64 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-40 rounded bg-slate-200" />
        <div className="mt-6 space-y-2">
          <div className="h-4 w-full rounded bg-slate-200" />
          <div className="h-4 w-4/5 rounded bg-slate-200" />
          <div className="h-4 w-3/5 rounded bg-slate-200" />
        </div>
        <div className="mt-6 h-40 rounded-xl border border-border bg-slate-100" />
      </section>
    </main>
  );
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toTimeInputValue(date: Date) {
  return date.toTimeString().slice(0, 5);
}

export default function BookingConfirmationPage({ params }: Props) {
  const [bookingId, setBookingId] = useState<string>("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("09:00");
  const [rescheduling, setRescheduling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    params.then((resolved) => setBookingId(resolved.id));
  }, [params]);

  async function loadBooking(id: string) {
    setLoading(true);
    try {
      const data = await apiFetch<Booking>(`/api/public/bookings/${id}`);
      setBooking(data);
      const start = new Date(data.startAt);
      setRescheduleDate(toDateInputValue(start));
      setRescheduleTime(toTimeInputValue(start));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking not found");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!bookingId) return;
    loadBooking(bookingId);
  }, [bookingId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedDateTime = useMemo(() => {
    if (!rescheduleDate || !rescheduleTime) return "";

    const localDate = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
    if (Number.isNaN(localDate.getTime())) return "";

    return localDate.toISOString();
  }, [rescheduleDate, rescheduleTime]);

  async function handleReschedule() {
    if (!bookingId || !selectedDateTime) return;

    setRescheduling(true);
    try {
      await apiFetch(`/api/public/bookings/${bookingId}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ selectedDateTime }),
      });
      await loadBooking(bookingId);
      setError(null);
      setToast("Successfully rescheduled.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reschedule booking");
    } finally {
      setRescheduling(false);
    }
  }

  if (loading) {
    return <BookingDetailsSkeleton />;
  }

  if (!booking) {
    return (
      <main className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Booking not found</h1>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="mx-auto my-10 max-w-2xl px-4 sm:px-6">
      <section className="card p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Booking confirmed
          </p>
          <Link href="/admin/events" className="btn-secondary text-sm">
            Home
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-semibold">{booking.eventTitle}</h1>
        <p className="mt-2 text-muted">Hosted by {booking.hostName}</p>

        <div className="mt-6 space-y-2 text-sm">
          <p>
            <span className="font-medium">When:</span>{" "}
            {new Date(booking.startAt).toLocaleString()} -{" "}
            {new Date(booking.endAt).toLocaleTimeString()}
          </p>
          <p>
            <span className="font-medium">Booked by:</span> {booking.guestName}{" "}
            ({booking.guestEmail})
          </p>
          <p>
            <span className="font-medium">Timezone:</span>{" "}
            {booking.guestTimezone}
          </p>
          <p>
            <span className="font-medium">Status:</span> {booking.status}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">Reschedule booking</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className="input"
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
            <input
              className="input"
              type="time"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
            />
          </div>
          <button
            className="btn-secondary mt-3 text-sm"
            onClick={handleReschedule}
            disabled={rescheduling || !selectedDateTime}
          >
            {rescheduling ? "Rescheduling..." : "Reschedule"}
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <Link href="/demo-user" className="btn-primary mt-6 inline-block">
          Book another event
        </Link>
      </section>

      {toast ? (
        <div className="fixed bottom-4 left-4 right-4 z-[70] rounded-lg bg-black px-4 py-2 text-sm text-white shadow-lg sm:left-auto sm:right-4 sm:w-auto">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
