"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type EventType = {
  id: number;
  title: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: number;
  slug: string;
  isActive: boolean;
  hostSlug?: string;
};

type EventPayload = {
  title: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: number;
  slug: string;
};

type BookingQuestion = {
  id: number;
  question: string;
  inputType: "text" | "textarea";
  isRequired: boolean;
  position: number;
};

const initialForm: EventPayload = {
  title: "",
  description: "",
  durationMinutes: 30,
  bufferMinutes: 0,
  slug: "",
};

function EventCardSkeleton() {
  return (
    <article className="animate-pulse rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="h-3 w-56 rounded bg-slate-200" />
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="h-8 w-20 rounded-lg bg-slate-200" />
          <div className="h-8 w-20 rounded-lg bg-slate-200" />
          <div className="h-8 w-20 rounded-lg bg-slate-200" />
        </div>
      </div>
      <div className="mt-3 h-3 w-full rounded bg-slate-200" />
    </article>
  );
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventType[]>([]);
  const [form, setForm] = useState<EventPayload>(initialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [questionsByEvent, setQuestionsByEvent] = useState<
    Record<number, BookingQuestion[]>
  >({});

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: EventType[] }>(
        "/api/admin/event-types",
      );
      setEvents(res.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const canSubmit = useMemo(() => {
    return form.title.trim().length > 0 && form.slug.trim().length > 2;
  }, [form]);

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/api/admin/event-types/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch("/api/admin/event-types", {
          method: "POST",
          body: JSON.stringify(form),
        });

        router.push("/admin/availability?from=create-event");
        return;
      }

      setForm(initialForm);
      setEditingId(null);
      setIsFormOpen(false);
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(initialForm);
  }

  function startEdit(item: EventType) {
    setIsFormOpen(true);
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description || "",
      durationMinutes: item.durationMinutes,
      bufferMinutes: item.bufferMinutes || 0,
      slug: item.slug,
    });
  }

  async function deleteEvent(id: number) {
    if (!confirm("Delete this event type?")) return;

    try {
      await apiFetch(`/api/admin/event-types/${id}`, { method: "DELETE" });
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete event");
    }
  }

  async function copyEventUrl(item: EventType) {
    try {
      const hostSlug = item.hostSlug || "demo-user";
      const bookingUrl = `${window.location.origin}/${hostSlug}/${item.slug}`;
      await navigator.clipboard.writeText(bookingUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1400);
    } catch {
      setError("Failed to copy URL");
    }
  }

  async function loadQuestions(eventTypeId: number) {
    try {
      const res = await apiFetch<{ data: BookingQuestion[] }>(
        `/api/admin/event-types/${eventTypeId}/questions`,
      );
      setQuestionsByEvent((prev) => ({ ...prev, [eventTypeId]: res.data }));
      if (res.data.length === 0) {
        alert("No questions mentioned.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load questions");
    }
  }

  async function addQuestion(eventTypeId: number) {
    const question = prompt("Question text");
    if (!question) return;
    const required = confirm("Should this question be required?");

    try {
      await apiFetch(`/api/admin/event-types/${eventTypeId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          question,
          inputType: "text",
          isRequired: required,
        }),
      });
      await loadQuestions(eventTypeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add question");
    }
  }

  async function deleteQuestion(eventTypeId: number, questionId: number) {
    try {
      await apiFetch(
        `/api/admin/event-types/${eventTypeId}/questions/${questionId}`,
        { method: "DELETE" },
      );
      await loadQuestions(eventTypeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete question");
    }
  }

  return (
    <section className="space-y-6">
      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-black/50"
            onClick={closeForm}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Edit event type" : "Add a new event type"}
            className="card relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5"
          >
            <h2 className="text-2xl font-semibold">
              {editingId ? "Edit event type" : "Add a new event type"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              Set up event types to offer different types of meetings.
            </p>

            <form className="mt-6 space-y-5" onSubmit={submitForm}>
              <div>
                <label className="mb-2 block text-sm font-medium">Title</label>
                <input
                  className="input"
                  placeholder="Quick chat"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">URL</label>
                <div className="flex items-center rounded-xl border border-border bg-surface px-3">
                  <span className="whitespace-nowrap text-sm text-muted">
                    /demo-user/
                  </span>
                  <input
                    className="h-11 w-full border-0 bg-transparent px-2 text-sm outline-none"
                    placeholder="intro-call"
                    value={form.slug}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "-")
                          .replace(/[^a-z0-9-]/g, ""),
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  className="input min-h-28"
                  placeholder="A quick video meeting."
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Duration
                </label>
                <div className="flex items-center rounded-xl border border-border bg-surface px-3">
                  <input
                    className="h-11 w-full border-0 bg-transparent text-sm outline-none"
                    type="number"
                    min={15}
                    step={15}
                    placeholder="15"
                    value={form.durationMinutes}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        durationMinutes: Number(e.target.value),
                      }))
                    }
                  />
                  <span className="text-sm text-muted">minutes</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Buffer</label>
                <div className="flex items-center rounded-xl border border-border bg-surface px-3">
                  <input
                    className="h-11 w-full border-0 bg-transparent text-sm outline-none"
                    type="number"
                    min={0}
                    step={5}
                    placeholder="0"
                    value={form.bufferMinutes}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        bufferMinutes: Number(e.target.value),
                      }))
                    }
                  />
                  <span className="text-sm text-muted">minutes</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-primary"
                  disabled={!canSubmit || saving}
                  type="submit"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Event types</h2>
            <p className="mt-1 text-sm text-muted">
              Configure different events for people to book on your calendar.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-border bg-white px-4 py-2 font-semibold text-black"
            onClick={() => {
              setEditingId(null);
              setForm(initialForm);
              setIsFormOpen(true);
            }}
          >
            + New
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 space-y-3">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <EventCardSkeleton key={`event-skeleton-${index}`} />
              ))
            : null}
          {events.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="break-all text-sm text-muted">
                    {item.durationMinutes} min (+{item.bufferMinutes || 0}{" "}
                    buffer) • /{item.hostSlug || "demo-user"}/{item.slug}
                  </p>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <button
                    className="btn-secondary flex-1 text-sm sm:flex-none"
                    onClick={() => loadQuestions(item.id)}
                  >
                    Questions
                  </button>
                  <button
                    className="btn-secondary flex-1 text-sm sm:flex-none"
                    onClick={() => addQuestion(item.id)}
                  >
                    Add Q
                  </button>
                  <button
                    className="btn-secondary flex-1 text-sm sm:flex-none"
                    onClick={() => copyEventUrl(item)}
                  >
                    {copiedId === item.id ? "Copied" : "Copy URL"}
                  </button>
                  <button
                    className="btn-secondary flex-1 text-sm sm:flex-none"
                    onClick={() => startEdit(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-secondary flex-1 text-sm sm:flex-none"
                    onClick={() => deleteEvent(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {item.description ? (
                <p className="mt-2 text-sm text-muted">{item.description}</p>
              ) : null}
              {(questionsByEvent[item.id] || []).length > 0 ? (
                <div className="mt-3 space-y-2">
                  {(questionsByEvent[item.id] || []).map((question) => (
                    <div
                      key={question.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <p className="text-sm text-muted">
                        {question.question}
                        {question.isRequired ? " *" : ""}
                      </p>
                      <button
                        className="btn-secondary text-xs"
                        onClick={() => deleteQuestion(item.id, question.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {!loading && events.length === 0 ? (
            <p className="text-sm text-muted">No events yet.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
