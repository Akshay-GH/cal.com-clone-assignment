"use client";

import { useEffect, useState } from "react";
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

export default function AvailabilityPage() {
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (res.items.length > 0) setItems(res.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load availability");
    } finally {
      setLoading(false);
    }
  }

  async function loadOverrides() {
    try {
      const res = await apiFetch<{ data: DateOverride[] }>(
        "/api/admin/availability/overrides",
      );
      setOverrides(res.data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load date overrides",
      );
    }
  }

  useEffect(() => {
    loadAvailability();
    loadOverrides();
  }, []);

  async function createSchedule() {
    const name = prompt("Schedule name", `Schedule ${schedules.length + 1}`);
    if (!name) return;

    try {
      const created = await apiFetch<AvailabilitySchedule>(
        "/api/admin/availability/schedules",
        {
          method: "POST",
          body: JSON.stringify({ name, timezone }),
        },
      );
      await loadAvailability(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create schedule");
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
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to set default schedule",
      );
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
      setError("Select a date for override");
      return;
    }

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save override");
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
      <h2 className="text-lg font-semibold">Weekly availability</h2>
      <p className="mt-1 text-sm text-muted">
        Set your timezone and available hours by weekday.
      </p>
      {fromCreateEvent ? (
        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Event created. Set availability and click Done to return to dashboard.
        </p>
      ) : null}

      {loading ? <p className="mt-4 text-sm text-muted">Loading...</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Availability schedules</p>
          <button className="btn-secondary text-sm" onClick={createSchedule}>
            Add schedule
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {schedules.map((schedule) => (
            <button
              key={schedule.id}
              className={`btn-secondary text-sm ${activeScheduleId === schedule.id ? "border-primary bg-primary-soft" : ""}`}
              onClick={() => loadAvailability(schedule.id)}
            >
              {schedule.name}
              {schedule.isDefault ? " (Default)" : ""}
            </button>
          ))}
        </div>
        {activeScheduleId ? (
          <button
            className="btn-secondary mt-2 text-sm"
            onClick={() => makeDefault(activeScheduleId)}
          >
            Make selected schedule default
          </button>
        ) : null}
      </div>

      <div className="mt-4 max-w-xs">
        <label className="mb-1 block text-sm font-medium">Timezone</label>
        <input
          className="input"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="UTC"
        />
      </div>

      <div className="mt-6 space-y-3">
        {items.map((item, index) => (
          <div
            key={item.dayOfWeek}
            className="rounded-xl border border-border p-3"
          >
            <div className="grid gap-3 sm:grid-cols-[120px,auto,1fr,24px,1fr] sm:items-center">
              <label className="text-sm font-medium">
                {dayLabels[item.dayOfWeek]}
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={item.isAvailable}
                  onChange={(e) =>
                    setItems((prev) => {
                      const copy = [...prev];
                      copy[index] = {
                        ...copy[index],
                        isAvailable: e.target.checked,
                      };
                      return copy;
                    })
                  }
                />
                Enabled
              </label>
              <input
                className="input"
                type="time"
                value={item.startTime}
                onChange={(e) =>
                  setItems((prev) => {
                    const copy = [...prev];
                    copy[index] = { ...copy[index], startTime: e.target.value };
                    return copy;
                  })
                }
              />
              <span className="hidden text-center text-sm text-muted sm:block">
                to
              </span>
              <input
                className="input"
                type="time"
                value={item.endTime}
                onChange={(e) =>
                  setItems((prev) => {
                    const copy = [...prev];
                    copy[index] = { ...copy[index], endTime: e.target.value };
                    return copy;
                  })
                }
              />
            </div>
          </div>
        ))}
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
          <label className="flex items-center gap-2 text-sm text-muted sm:col-span-1">
            <input
              type="checkbox"
              checked={overrideBlocked}
              onChange={(e) => setOverrideBlocked(e.target.checked)}
            />
            Block day
          </label>
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
        <button className="btn-secondary mt-3 text-sm" onClick={addOverride}>
          Add override
        </button>

        <div className="mt-4 space-y-2">
          {overrides.map((item) => (
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
              >
                Remove
              </button>
            </div>
          ))}
          {overrides.length === 0 ? (
            <p className="text-sm text-muted">No date overrides added yet.</p>
          ) : null}
        </div>
      </div>

      <button className="btn-primary mt-5" onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Done"}
      </button>
    </section>
  );
}
