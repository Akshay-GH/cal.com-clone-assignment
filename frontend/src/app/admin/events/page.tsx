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
  const [toast, setToast] = useState<string | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<number | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [questionEventId, setQuestionEventId] = useState<number | null>(null);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);

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

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
    setDeleteEventId(id);
  }

  async function confirmDeleteEvent() {
    if (!deleteEventId || deletingEvent) return;

    setDeletingEvent(true);
    try {
      await apiFetch(`/api/admin/event-types/${deleteEventId}`, {
        method: "DELETE",
      });
      await loadEvents();
      setToast("Event type deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete event");
    } finally {
      setDeletingEvent(false);
      setDeleteEventId(null);
    }
  }

  async function copyEventUrl(item: EventType) {
    try {
      const hostSlug = item.hostSlug || "demo-user";
      const bookingUrl = `${window.location.origin}/${hostSlug}/${item.slug}`;
      await navigator.clipboard.writeText(bookingUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1400);
      setToast("Booking URL copied.");
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
        setToast("No questions mentioned.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load questions");
    }
  }

  function openAddQuestionModal(eventTypeId: number) {
    setQuestionEventId(eventTypeId);
    setNewQuestionText("");
    setNewQuestionRequired(false);
  }

  async function submitAddQuestion() {
    if (!questionEventId || !newQuestionText.trim()) return;

    setAddingQuestion(true);
    try {
      await apiFetch(`/api/admin/event-types/${questionEventId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          question: newQuestionText.trim(),
          inputType: "text",
          isRequired: newQuestionRequired,
        }),
      });
      await loadQuestions(questionEventId);
      setQuestionEventId(null);
      setToast("Question added.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add question");
    } finally {
      setAddingQuestion(false);
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
      {deleteEventId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close delete dialog"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!deletingEvent) setDeleteEventId(null);
            }}
            disabled={deletingEvent}
          />
          <div className="card relative z-10 w-full max-w-md p-5">
            <h3 className="text-lg font-semibold">Delete event type?</h3>
            <p className="mt-2 text-sm text-muted">
              This action cannot be undone.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                className="btn-secondary"
                onClick={() => setDeleteEventId(null)}
                disabled={deletingEvent}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={confirmDeleteEvent}
                disabled={deletingEvent}
              >
                {deletingEvent ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {questionEventId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close add question dialog"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setQuestionEventId(null)}
          />
          <div className="card relative z-10 w-full max-w-lg p-5">
            <h3 className="text-lg font-semibold">Add booking question</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Question text
                </label>
                <input
                  className="input"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="What should we prepare before the call?"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={newQuestionRequired}
                  onChange={(e) => setNewQuestionRequired(e.target.checked)}
                />
                Mark as required
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="btn-secondary"
                onClick={() => setQuestionEventId(null)}
                disabled={addingQuestion}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={submitAddQuestion}
                disabled={addingQuestion || !newQuestionText.trim()}
              >
                {addingQuestion ? "Adding..." : "Add question"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
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
            className="btn-secondary text-sm"
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
                    onClick={() => openAddQuestionModal(item.id)}
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

      {toast ? (
        <div className="fixed bottom-4 left-4 right-4 z-[70] rounded-lg bg-black px-4 py-2 text-sm text-white shadow-lg sm:left-auto sm:right-4 sm:w-auto">
          {toast}
        </div>
      ) : null}
    </section>
  );
}
