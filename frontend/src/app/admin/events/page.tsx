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

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventType[]>([]);
  const [form, setForm] = useState<EventPayload>(initialForm);
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
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: EventType) {
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
    <section className="grid gap-6 xl:grid-cols-[380px,1fr]">
      <div className="card p-5">
        <h2 className="text-lg font-semibold">
          {editingId ? "Edit event type" : "Create event type"}
        </h2>
        <form className="mt-4 space-y-3" onSubmit={submitForm}>
          <input
            className="input"
            placeholder="Title"
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
          />
          <input
            className="input"
            placeholder="Slug (intro-call)"
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
          <input
            className="input"
            type="number"
            min={15}
            step={15}
            value={form.durationMinutes}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                durationMinutes: Number(e.target.value),
              }))
            }
          />
          <input
            className="input"
            type="number"
            min={0}
            step={5}
            placeholder="Buffer minutes"
            value={form.bufferMinutes}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                bufferMinutes: Number(e.target.value),
              }))
            }
          />
          <textarea
            className="input min-h-24"
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
          />
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-primary"
              disabled={!canSubmit || saving}
              type="submit"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold">Event types</h2>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {loading ? <p className="mt-4 text-sm text-muted">Loading...</p> : null}
        <div className="mt-4 space-y-3">
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
                    className="btn-secondary text-sm"
                    onClick={() => loadQuestions(item.id)}
                  >
                    Questions
                  </button>
                  <button
                    className="btn-secondary text-sm"
                    onClick={() => addQuestion(item.id)}
                  >
                    Add Q
                  </button>
                  <button
                    className="btn-secondary text-sm"
                    onClick={() => copyEventUrl(item)}
                  >
                    {copiedId === item.id ? "Copied" : "Copy URL"}
                  </button>
                  <button
                    className="btn-secondary text-sm"
                    onClick={() => startEdit(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-secondary text-sm"
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
