"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type AvailabilityItem = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

type AvailabilitySchedule = {
  id: number;
  name: string;
  timezone: string;
  isDefault: boolean;
};

type DateOverride = {
  id: number;
  overrideDate: string;
  startTime: string | null;
  endTime: string | null;
  isBlocked: boolean;
};

const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const fallbackItems: AvailabilityItem[] = dayLabels.map((_, day) => ({
  dayOfWeek: day,
  startTime: "09:00",
  endTime: "17:00",
  isAvailable: day >= 1 && day <= 5,
}));

function normalizeAvailabilityItems(
  sourceItems: AvailabilityItem[] | undefined,
): AvailabilityItem[] {
  const byDay = new Map(
    (sourceItems || []).map((item) => [item.dayOfWeek, item]),
  );

  return fallbackItems.map((fallback) => {
    const existing = byDay.get(fallback.dayOfWeek);
    return existing
      ? {
          dayOfWeek: fallback.dayOfWeek,
          startTime: existing.startTime,
          endTime: existing.endTime,
          isAvailable: existing.isAvailable,
        }
      : fallback;
  });
}

function SchedulePillSkeleton() {
  return <div className="h-9 w-32 animate-pulse rounded-lg bg-slate-200" />;
}

function AvailabilityRowSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-[120px,auto,1fr,24px,1fr] sm:items-center">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-4 w-16 rounded bg-slate-200" />
        <div className="h-10 rounded bg-slate-200" />
        <div className="hidden sm:block" />
        <div className="h-10 rounded bg-slate-200" />
      </div>
    </div>
  );
}

function OverrideItemSkeleton() {
  return (
    <div className="flex animate-pulse items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
      <div className="h-4 w-48 rounded bg-slate-200" />
      <div className="h-8 w-20 rounded bg-slate-200" />
    </div>
  );
}

function AvailabilityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCreateEvent = searchParams.get("from") === "create-event";

  const [timezone, setTimezone] = useState("UTC");
  const [items, setItems] = useState<AvailabilityItem[]>(fallbackItems);
  const [schedules, setSchedules] = useState<AvailabilitySchedule[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideBlocked, setOverrideBlocked] = useState(true);
  const [overrideStartTime, setOverrideStartTime] = useState("09:00");
  const [overrideEndTime, setOverrideEndTime] = useState("17:00");
  const [loading, setLoading] = useState(true);
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [addingOverride, setAddingOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScheduleList, setShowScheduleList] = useState(true);
  const [openScheduleMenuId, setOpenScheduleMenuId] = useState<number | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);
  const [newScheduleName, setNewScheduleName] = useState("");
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [creatingScheduleSubmitting, setCreatingScheduleSubmitting] =
    useState(false);
  const [deleteScheduleId, setDeleteScheduleId] = useState<number | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState(false);

  async function loadAvailability(scheduleId?: number) {
    setLoading(true);
    try {
      const res = await apiFetch<{
        timezone: string;
        items: AvailabilityItem[];
        schedules: AvailabilitySchedule[];
        activeScheduleId: number;
      }>(
        `/api/admin/availability${scheduleId ? `?scheduleId=${scheduleId}` : ""}`,
      );
      setTimezone(res.timezone);
      setSchedules(res.schedules || []);
      setActiveScheduleId(res.activeScheduleId || null);
      setItems(normalizeAvailabilityItems(res.items));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load availability");
    } finally {
      setLoading(false);
    }
  }

  async function loadOverrides() {
    setLoadingOverrides(true);
    try {
      const res = await apiFetch<{ data: DateOverride[] }>(
        "/api/admin/availability/overrides",
      );
      setOverrides(res.data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load date overrides",
      );
    } finally {
      setLoadingOverrides(false);
    }
  }

  useEffect(() => {
    loadAvailability();
    loadOverrides();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openCreateScheduleModal() {
    setNewScheduleName(`Schedule ${schedules.length + 1}`);
    setCreatingSchedule(true);
  }

  async function createSchedule() {
    if (!newScheduleName.trim() || creatingScheduleSubmitting) return;

    setCreatingScheduleSubmitting(true);

    try {
      const created = await apiFetch<AvailabilitySchedule>(
        "/api/admin/availability/schedules",
        {
          method: "POST",
          body: JSON.stringify({ name: newScheduleName.trim(), timezone }),
        },
      );
      await loadAvailability(created.id);
      setShowScheduleList(false);
      setCreatingSchedule(false);
      setToast("Schedule created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create schedule");
    } finally {
      setCreatingScheduleSubmitting(false);
    }
  }

  async function makeDefault(scheduleId: number) {
    try {
      await apiFetch(
        `/api/admin/availability/schedules/${scheduleId}/default`,
        {
          method: "PATCH",
        },
      );
      await loadAvailability(scheduleId);
      setOpenScheduleMenuId(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to set default schedule",
      );
    }
  }

  async function deleteSchedule(scheduleId: number) {
    setDeleteScheduleId(scheduleId);
  }

  async function confirmDeleteSchedule() {
    if (!deleteScheduleId || deletingSchedule) return;

    setDeletingSchedule(true);

    try {
      await apiFetch(`/api/admin/availability/schedules/${deleteScheduleId}`, {
        method: "DELETE",
      });
      await loadAvailability();
      setOpenScheduleMenuId(null);
      setDeleteScheduleId(null);
      setToast("Schedule deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete schedule");
    } finally {
      setDeletingSchedule(false);
    }
  }

  async function save() {
    if (!activeScheduleId) {
      setError("No active schedule selected");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/admin/availability", {
        method: "PUT",
        body: JSON.stringify({ scheduleId: activeScheduleId, timezone, items }),
      });
      setError(null);
      router.push("/admin/events");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save availability");
    } finally {
      setSaving(false);
    }
  }

  async function addOverride() {
    if (!overrideDate) {
      setToast("Select a date for override.");
      return;
    }

    setAddingOverride(true);
    try {
      await apiFetch("/api/admin/availability/overrides", {
        method: "POST",
        body: JSON.stringify({
          overrideDate,
          isBlocked: overrideBlocked,
          startTime: overrideBlocked ? undefined : overrideStartTime,
          endTime: overrideBlocked ? undefined : overrideEndTime,
        }),
      });
      setOverrideDate("");
      await loadOverrides();
      setError(null);
      setToast("Override added.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save override");
    } finally {
      setAddingOverride(false);
    }
  }

  async function deleteOverride(id: number) {
    try {
      await apiFetch(`/api/admin/availability/overrides/${id}`, {
        method: "DELETE",
      });
      await loadOverrides();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete override");
    }
  }

  return (
    <section className="card p-5">
      {creatingSchedule ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close create schedule dialog"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!creatingScheduleSubmitting) setCreatingSchedule(false);
            }}
            disabled={creatingScheduleSubmitting}
          />
          <div className="card relative z-10 w-full max-w-md p-5">
            <h3 className="text-lg font-semibold">Create schedule</h3>
            <div className="mt-3">
              <label className="mb-2 block text-sm font-medium">
                Schedule name
              </label>
              <input
                className="input"
                value={newScheduleName}
                onChange={(e) => setNewScheduleName(e.target.value)}
                placeholder="Weekday schedule"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="btn-secondary"
                onClick={() => setCreatingSchedule(false)}
                disabled={creatingScheduleSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={createSchedule}
                disabled={!newScheduleName.trim() || creatingScheduleSubmitting}
              >
                {creatingScheduleSubmitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteScheduleId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close delete schedule dialog"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!deletingSchedule) setDeleteScheduleId(null);
            }}
            disabled={deletingSchedule}
          />
          <div className="card relative z-10 w-full max-w-md p-5">
            <h3 className="text-lg font-semibold">Delete schedule?</h3>
            <p className="mt-2 text-sm text-muted">
              {schedules.find((s) => s.id === deleteScheduleId)?.name ||
                "Selected schedule"}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                className="btn-secondary"
                onClick={() => setDeleteScheduleId(null)}
                disabled={deletingSchedule}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={confirmDeleteSchedule}
                disabled={deletingSchedule}
              >
                {deletingSchedule ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <h2 className="text-lg font-semibold">Weekly availability</h2>
      <p className="mt-1 text-sm text-muted">
        Set your timezone and available hours by weekday.
      </p>
      {fromCreateEvent ? (
        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Event created. Set availability and click Done to return to dashboard.
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {showScheduleList ? (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Availability schedules</p>
            <button
              className="btn-secondary text-sm"
              onClick={openCreateScheduleModal}
              disabled={loading}
            >
              Add schedule
            </button>
          </div>
          <div className="space-y-2">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <SchedulePillSkeleton key={`schedule-skeleton-${index}`} />
                ))
              : schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`w-full rounded-xl border px-4 py-3 transition ${
                      activeScheduleId === schedule.id
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:bg-surface-soft"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={async () => {
                          await loadAvailability(schedule.id);
                          setShowScheduleList(false);
                          setOpenScheduleMenuId(null);
                        }}
                        disabled={loading}
                      >
                        <p className="text-base font-semibold">
                          {schedule.name}
                          {schedule.isDefault ? (
                            <span className="ml-2 rounded-md bg-surface-soft px-2 py-0.5 text-xs font-medium text-muted">
                              Default
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          ◉ {schedule.timezone}
                        </p>
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          className="rounded-xl border border-border px-3 py-2 text-sm text-muted hover:bg-surface-soft"
                          aria-label="Schedule actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenScheduleMenuId((prev) =>
                              prev === schedule.id ? null : schedule.id,
                            );
                          }}
                        >
                          •••
                        </button>

                        {openScheduleMenuId === schedule.id ? (
                          <div className="absolute right-0 z-10 mt-2 w-52 rounded-xl border border-border bg-surface p-1 shadow-lg">
                            <button
                              type="button"
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-soft"
                              onClick={() => makeDefault(schedule.id)}
                            >
                              Make selected schedule default
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-surface-soft"
                              onClick={() => deleteSchedule(schedule.id)}
                            >
                              Delete selected schedule
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted hover:bg-surface-soft"
              onClick={() => {
                setShowScheduleList(true);
                setOpenScheduleMenuId(null);
              }}
            >
              <span aria-hidden>←</span>
              Back to available schedules
            </button>
          </div>

          <div className="mt-4 max-w-xs">
            <label className="mb-1 block text-sm font-medium">Timezone</label>
            <input
              className="input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="UTC"
              disabled={loading}
            />
          </div>

          <div className="mt-6 rounded-xl border border-border p-3">
            <div className="space-y-2">
              {loading
                ? Array.from({ length: 7 }).map((_, index) => (
                    <AvailabilityRowSkeleton
                      key={`availability-skeleton-${index}`}
                    />
                  ))
                : items.map((item) => (
                    <div key={item.dayOfWeek} className="rounded-xl p-2">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3 sm:w-44 sm:flex-none">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.isAvailable}
                            aria-label={`Toggle ${dayLabels[item.dayOfWeek]} availability`}
                            className={`relative h-7 w-12 rounded-full border transition ${
                              item.isAvailable
                                ? "border-zinc-200 bg-zinc-100"
                                : "border-zinc-500 bg-zinc-800"
                            }`}
                            onClick={() =>
                              setItems((prev) =>
                                prev.map((entry) =>
                                  entry.dayOfWeek === item.dayOfWeek
                                    ? {
                                        ...entry,
                                        isAvailable: !entry.isAvailable,
                                      }
                                    : entry,
                                ),
                              )
                            }
                          >
                            <span
                              className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-black transition ${
                                item.isAvailable ? "left-[25px]" : "left-0.5"
                              }`}
                            />
                          </button>
                          <label className="text-sm font-medium leading-none sm:text-base">
                            {dayLabels[item.dayOfWeek]}
                          </label>
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                          <input
                            className="input min-w-0 flex-1"
                            type="time"
                            value={item.startTime}
                            disabled={!item.isAvailable}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((entry) =>
                                  entry.dayOfWeek === item.dayOfWeek
                                    ? {
                                        ...entry,
                                        startTime: e.target.value,
                                      }
                                    : entry,
                                ),
                              )
                            }
                          />
                          <span className="hidden text-center text-sm text-muted sm:block">
                            -
                          </span>
                          <input
                            className="input min-w-0 flex-1"
                            type="time"
                            value={item.endTime}
                            disabled={!item.isAvailable}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((entry) =>
                                  entry.dayOfWeek === item.dayOfWeek
                                    ? {
                                        ...entry,
                                        endTime: e.target.value,
                                      }
                                    : entry,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold">Date overrides</h3>
            <p className="mt-1 text-sm text-muted">
              Block specific dates or set custom hours.
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-5">
              <input
                className="input sm:col-span-2"
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
              />
              <div className="flex items-center gap-2 text-sm text-muted sm:col-span-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={overrideBlocked}
                  aria-label="Toggle block day"
                  className={`relative h-7 w-12 rounded-full border transition ${
                    overrideBlocked
                      ? "border-zinc-500 bg-zinc-800"
                      : "border-zinc-200 bg-zinc-100"
                  }`}
                  onClick={() => setOverrideBlocked((prev) => !prev)}
                >
                  <span
                    className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-black transition ${
                      overrideBlocked ? "left-[25px]" : "left-0.5"
                    }`}
                  />
                </button>
                Block day
              </div>
              <input
                className="input"
                type="time"
                value={overrideStartTime}
                onChange={(e) => setOverrideStartTime(e.target.value)}
                disabled={overrideBlocked}
              />
              <input
                className="input"
                type="time"
                value={overrideEndTime}
                onChange={(e) => setOverrideEndTime(e.target.value)}
                disabled={overrideBlocked}
              />
            </div>
            <button
              className="btn-secondary mt-3 text-sm"
              onClick={addOverride}
              disabled={addingOverride || loadingOverrides}
            >
              {addingOverride ? "Adding..." : "Add override"}
            </button>

            <div className="mt-4 space-y-2">
              {loadingOverrides
                ? Array.from({ length: 3 }).map((_, index) => (
                    <OverrideItemSkeleton key={`override-skeleton-${index}`} />
                  ))
                : overrides.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <p className="text-sm text-muted">
                        {item.overrideDate} -{" "}
                        {item.isBlocked
                          ? "Blocked"
                          : `${item.startTime || "-"} to ${item.endTime || "-"}`}
                      </p>
                      <button
                        className="btn-secondary text-sm"
                        onClick={() => deleteOverride(item.id)}
                        disabled={loadingOverrides}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
              {!loadingOverrides && overrides.length === 0 ? (
                <p className="text-sm text-muted">
                  No date overrides added yet.
                </p>
              ) : null}
            </div>
          </div>

          <button
            className="btn-primary mt-5"
            onClick={save}
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Done"}
          </button>
        </>
      )}

      {toast ? (
        <div className="fixed bottom-4 left-4 right-4 z-[70] rounded-lg bg-black px-4 py-2 text-sm text-white shadow-lg sm:left-auto sm:right-4 sm:w-auto">
          {toast}
        </div>
      ) : null}
    </section>
  );
}

export default function AvailabilityPage() {
  return (
    <Suspense
      fallback={
        <section className="card p-5">
          <p className="text-sm text-muted">Loading availability...</p>
        </section>
      }
    >
      <AvailabilityPageContent />
    </Suspense>
  );
}
