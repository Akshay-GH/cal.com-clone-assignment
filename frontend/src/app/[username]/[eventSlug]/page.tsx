"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Props = {
  params: Promise<{ username: string; eventSlug: string }>;
};

type EventType = {
  id: number;
  title: string;
  description: string;
  durationMinutes: number;
  bufferMinutes?: number;
  slug: string;
};

type BookingQuestion = {
  id: number;
  question: string;
  inputType: "text" | "textarea";
  isRequired: boolean;
  position: number;
};

type Slot = {
  startAtUtc: string;
  label: string;
};

function BookingHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
      <div className="h-8 w-52 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function SlotSkeleton() {
  return <div className="h-10 animate-pulse rounded-lg bg-slate-200" />;
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = new Date();
const todayDate = toDateKey(today);

function buildMonthGrid(currentMonth: Date) {
  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  );
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstDay.getDay(); i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
    );
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export default function EventBookingPage({ params }: Props) {
  const [username, setUsername] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [date, setDate] = useState(todayDate);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [questions, setQuestions] = useState<BookingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((resolved) => {
      setUsername(resolved.username);
      setEventSlug(resolved.eventSlug);
    });
  }, [params]);

  useEffect(() => {
    async function loadEvent() {
      if (!username) return;
      setLoadingEvent(true);
      try {
        const details = await apiFetch<{
          event: EventType;
          questions: BookingQuestion[];
        }>(`/api/public/${username}/${eventSlug}/details`);
        setEventType(details.event || null);
        setQuestions(details.questions || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load event");
      } finally {
        setLoadingEvent(false);
      }
    }

    loadEvent();
  }, [username, eventSlug]);

  useEffect(() => {
    async function loadSlots() {
      if (!username || !eventSlug || !date) return;
      setLoadingSlots(true);
      setSelectedSlot("");
      try {
        const res = await apiFetch<{ slots: Slot[] }>(
          `/api/public/${username}/${eventSlug}/slots?date=${date}&timezone=${encodeURIComponent(timezone)}`,
        );
        setSlots(res.slots);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load slots");
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [username, eventSlug, date, timezone]);

  const canSubmit = useMemo(() => {
    const requiredMissing = questions.some(
      (question) => question.isRequired && !(answers[question.id] || "").trim(),
    );

    return Boolean(
      eventType?.id &&
      guestName.trim() &&
      guestEmail.trim() &&
      selectedSlot &&
      !requiredMissing,
    );
  }, [eventType, guestName, guestEmail, selectedSlot, questions, answers]);

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth]);

  const monthGrid = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  function previousMonth() {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  }

  function nextMonth() {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  }

  async function submitBooking(event: React.FormEvent) {
    event.preventDefault();
    if (!eventType) return;

    setBooking(true);
    try {
      const response = await apiFetch<{ id: number }>("/api/public/bookings", {
        method: "POST",
        body: JSON.stringify({
          eventTypeId: eventType.id,
          guestName,
          guestEmail,
          guestTimezone: timezone,
          selectedDateTime: selectedSlot,
          customAnswers: questions
            .map((question) => ({
              questionId: question.id,
              answer: answers[question.id] || "",
            }))
            .filter((item) => item.answer.trim().length > 0),
        }),
      });

      window.location.href = `/bookings/${response.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
      setBooking(false);
    }
  }

  if (!eventType && !loadingEvent && !error) {
    return (
      <main className="mx-auto mt-10 max-w-3xl rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Event not found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto my-8 max-w-6xl px-4 sm:px-6">
      <section className="grid gap-4 md:grid-cols-[320px,1fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Booking
            </p>
            <Link href="/" className="btn-secondary text-sm">
              Home
            </Link>
          </div>
          {loadingEvent ? (
            <div className="mt-2">
              <BookingHeaderSkeleton />
            </div>
          ) : (
            <>
              <h1 className="mt-2 text-2xl font-semibold">
                {eventType?.title || "-"}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {eventType?.durationMinutes || "-"} minutes
              </p>
              {eventType?.description ? (
                <p className="mt-4 text-sm text-muted">
                  {eventType.description}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="card p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
            <div>
              <label className="mb-1 block text-sm font-medium">Date</label>
              <div className="rounded-xl border border-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1 text-sm"
                    onClick={previousMonth}
                  >
                    Prev
                  </button>
                  <p className="text-sm font-semibold">{monthLabel}</p>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1 text-sm"
                    onClick={nextMonth}
                  >
                    Next
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (dayName) => (
                      <span key={dayName}>{dayName}</span>
                    ),
                  )}
                </div>

                <div className="mt-1 grid grid-cols-7 gap-1">
                  {monthGrid.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="h-9" />;
                    }

                    const dayKey = toDateKey(day);
                    const isPast = dayKey < todayDate;
                    const isSelected = dayKey === date;

                    return (
                      <button
                        key={dayKey}
                        type="button"
                        disabled={isPast}
                        onClick={() => setDate(dayKey)}
                        className={`h-9 rounded-md border text-sm ${isSelected ? "border-primary bg-primary-soft" : "border-border bg-surface"} ${isPast ? "cursor-not-allowed opacity-40" : "hover:bg-surface-soft"}`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted">Selected date: {date}</p>
              <label className="mb-1 mt-3 block text-sm font-medium">
                Timezone
              </label>
              <input
                className="input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />

              <div className="mt-4 rounded-xl border border-border p-3">
                <p className="text-sm font-medium">Available slots</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {loadingSlots
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <SlotSkeleton key={`slot-skeleton-${index}`} />
                      ))
                    : slots.map((slot) => (
                        <button
                          key={slot.startAtUtc}
                          type="button"
                          className={`rounded-lg border px-3 py-2 text-sm ${selectedSlot === slot.startAtUtc ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
                          onClick={() => setSelectedSlot(slot.startAtUtc)}
                        >
                          {slot.label}
                        </button>
                      ))}
                </div>
                {!loadingSlots && slots.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No slots available.</p>
                ) : null}
              </div>
            </div>

            <form onSubmit={submitBooking} className="space-y-3">
              <label className="mb-1 block text-sm font-medium">
                Your name
              </label>
              <input
                className="input"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
              />
              <label className="mb-1 block text-sm font-medium">
                Your email
              </label>
              <input
                className="input"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
              />

              {questions.length > 0 ? (
                <div className="space-y-3 rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">Additional questions</p>
                  {questions.map((question) => (
                    <div key={question.id}>
                      <label className="mb-1 block text-sm font-medium">
                        {question.question}
                        {question.isRequired ? " *" : ""}
                      </label>
                      {question.inputType === "textarea" ? (
                        <textarea
                          className="input min-h-20"
                          value={answers[question.id] || ""}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question.id]: e.target.value,
                            }))
                          }
                          required={question.isRequired}
                        />
                      ) : (
                        <input
                          className="input"
                          value={answers[question.id] || ""}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question.id]: e.target.value,
                            }))
                          }
                          required={question.isRequired}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="rounded-xl border border-border p-3 text-sm text-muted">
                Selected slot:{" "}
                {selectedSlot
                  ? new Date(selectedSlot).toLocaleString()
                  : "None"}
              </div>

              <button
                className="btn-primary w-full"
                type="submit"
                disabled={!canSubmit || booking}
              >
                {booking ? "Booking..." : "Confirm booking"}
              </button>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
