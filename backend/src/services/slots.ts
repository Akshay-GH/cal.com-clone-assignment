import { addMinutes, format, isAfter, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { pool } from "../db/pool";

type BookingRange = {
  startAt: Date;
  endAt: Date;
  bufferMinutes: number;
};

type GetAvailableSlotsInput = {
  userId: number;
  eventTypeId: number;
  date: string;
  timezone: string;
};

function buildUtcDateFromLocalDateAndTime(
  dateStr: string,
  timeStr: string,
  timezone: string,
) {
  const localDateTime = `${dateStr}T${timeStr}:00`;
  return fromZonedTime(localDateTime, timezone);
}

function hasOverlap(slotStart: Date, slotEnd: Date, booking: BookingRange) {
  const bookingStart = addMinutes(booking.startAt, -booking.bufferMinutes);
  const bookingEnd = addMinutes(booking.endAt, booking.bufferMinutes);
  return slotStart < bookingEnd && slotEnd > bookingStart;
}

async function getAvailableSlots({
  userId,
  eventTypeId,
  date,
  timezone,
}: GetAvailableSlotsInput) {
  const eventRes = await pool.query<{
    id: number;
    duration_minutes: number;
    buffer_minutes: number;
  }>(
    `SELECT id, duration_minutes, buffer_minutes FROM event_types WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
    [eventTypeId, userId],
  );

  if (eventRes.rows.length === 0) {
    const error = new Error("Event type not found") as Error & {
      status?: number;
    };
    error.status = 404;
    throw error;
  }

  const durationMinutes = eventRes.rows[0].duration_minutes;
  const eventBufferMinutes = eventRes.rows[0].buffer_minutes || 0;

  const userRes = await pool.query<{ timezone: string }>(
    `SELECT timezone FROM users WHERE id = $1`,
    [userId],
  );

  const scheduleRes = await pool.query<{ id: number; timezone: string }>(
    `
    SELECT id, timezone
    FROM availability_schedules
    WHERE user_id = $1
    ORDER BY is_default DESC, id ASC
    LIMIT 1
    `,
    [userId],
  );

  const activeSchedule = scheduleRes.rows[0];
  const hostTimezone =
    activeSchedule?.timezone || userRes.rows[0]?.timezone || "UTC";

  const dayOfWeek = toZonedTime(
    new Date(`${date}T12:00:00Z`),
    hostTimezone,
  ).getDay();

  const overrideRes = await pool.query<{
    start_time: string | null;
    end_time: string | null;
    is_blocked: boolean;
  }>(
    `
    SELECT start_time, end_time, is_blocked
    FROM date_overrides
    WHERE user_id = $1 AND override_date = $2::date
    LIMIT 1
    `,
    [userId, date],
  );

  const override = overrideRes.rows[0];
  if (override?.is_blocked) {
    return [];
  }

  const availabilityRes = activeSchedule
    ? await pool.query<{
        start_time: string;
        end_time: string;
      }>(
        `
        SELECT start_time, end_time
        FROM availability_schedule_slots
        WHERE schedule_id = $1 AND day_of_week = $2 AND is_available = TRUE
        LIMIT 1
        `,
        [activeSchedule.id, dayOfWeek],
      )
    : await pool.query<{
        start_time: string;
        end_time: string;
      }>(
        `
        SELECT start_time, end_time
        FROM availabilities
        WHERE user_id = $1 AND day_of_week = $2 AND is_available = TRUE
        LIMIT 1
        `,
        [userId, dayOfWeek],
      );

  if (availabilityRes.rows.length === 0) {
    return [];
  }

  const baseStartTime =
    override?.start_time ?? availabilityRes.rows[0].start_time;
  const baseEndTime = override?.end_time ?? availabilityRes.rows[0].end_time;
  if (!baseStartTime || !baseEndTime) {
    return [];
  }

  const startTimeValue = String(baseStartTime).slice(0, 5);
  const endTimeValue = String(baseEndTime).slice(0, 5);

  const windowStartUtc = buildUtcDateFromLocalDateAndTime(
    date,
    startTimeValue,
    hostTimezone,
  );
  const windowEndUtc = buildUtcDateFromLocalDateAndTime(
    date,
    endTimeValue,
    hostTimezone,
  );

  const bookingsRes = await pool.query<{
    start_at: string;
    end_at: string;
    buffer_minutes: number;
  }>(
    `
    SELECT b.start_at, b.end_at, e.buffer_minutes
    FROM bookings b
    INNER JOIN event_types e ON e.id = b.event_type_id
    WHERE b.user_id = $1
      AND b.status = 'confirmed'
      AND b.start_at < $3
      AND b.end_at > $2
    ORDER BY b.start_at ASC
    `,
    [userId, windowStartUtc.toISOString(), windowEndUtc.toISOString()],
  );

  const existing = bookingsRes.rows.map((row) => ({
    startAt: new Date(row.start_at),
    endAt: new Date(row.end_at),
    bufferMinutes: row.buffer_minutes || 0,
  }));

  const now = new Date();
  const slots: Array<{ startAtUtc: string; label: string }> = [];

  let cursor = new Date(windowStartUtc);
  while (cursor < windowEndUtc) {
    const slotEnd = addMinutes(cursor, durationMinutes);

    if (slotEnd <= windowEndUtc && isAfter(cursor, startOfDay(now))) {
      const slotWithBufferEnd = addMinutes(slotEnd, eventBufferMinutes);
      const blocked = existing.some((booking) =>
        hasOverlap(cursor, slotWithBufferEnd, booking),
      );
      if (!blocked && cursor > now) {
        const local = toZonedTime(cursor, timezone);
        slots.push({
          startAtUtc: cursor.toISOString(),
          label: format(local, "hh:mm a"),
        });
      }
    }

    cursor = addMinutes(cursor, durationMinutes);
  }

  return slots;
}

export { getAvailableSlots };
