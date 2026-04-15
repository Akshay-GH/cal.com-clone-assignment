import { addMinutes } from "date-fns";

import { pool } from "../db/pool";
import { dispatchBookingNotification } from "./notifications";

type CreateBookingInput = {
  eventTypeId: number;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  selectedDateTime: string;
  customAnswers?: Array<{ questionId: number; answer: string }>;
};

type RescheduleBookingInput = {
  bookingId: number;
  selectedDateTime: string;
};

async function createBooking({
  eventTypeId,
  guestName,
  guestEmail,
  guestTimezone,
  selectedDateTime,
  customAnswers,
}: CreateBookingInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const eventRes = await client.query<{
      id: number;
      user_id: number;
      duration_minutes: number;
      buffer_minutes: number;
    }>(
      `
      SELECT id, user_id, duration_minutes, buffer_minutes
      FROM event_types
      WHERE id = $1 AND is_active = TRUE
      LIMIT 1
      `,
      [eventTypeId],
    );

    if (eventRes.rows.length === 0) {
      const error = new Error("Event type not found") as Error & {
        status?: number;
      };
      error.status = 404;
      throw error;
    }

    const eventType = eventRes.rows[0];
    const startAt = new Date(selectedDateTime);
    const endAt = addMinutes(startAt, eventType.duration_minutes);

    if (Number.isNaN(startAt.getTime())) {
      const error = new Error("Invalid selectedDateTime") as Error & {
        status?: number;
      };
      error.status = 400;
      throw error;
    }

    if (startAt <= new Date()) {
      const error = new Error("Cannot book in the past") as Error & {
        status?: number;
      };
      error.status = 400;
      throw error;
    }

    const conflictRes = await client.query<{ id: number }>(
      `
      SELECT b.id
      FROM bookings b
      INNER JOIN event_types e ON e.id = b.event_type_id
      WHERE b.user_id = $1
        AND b.status = 'confirmed'
        AND tstzrange(
              b.start_at - make_interval(mins => e.buffer_minutes),
              b.end_at + make_interval(mins => e.buffer_minutes),
              '[)'
            )
            &&
            tstzrange(
              $2::timestamptz - make_interval(mins => $4::int),
              $3::timestamptz + make_interval(mins => $4::int),
              '[)'
            )
      LIMIT 1
      `,
      [
        eventType.user_id,
        startAt.toISOString(),
        endAt.toISOString(),
        eventType.buffer_minutes || 0,
      ],
    );

    if (conflictRes.rows.length > 0) {
      const error = new Error("Slot already booked") as Error & {
        status?: number;
      };
      error.status = 409;
      throw error;
    }

    const insertRes = await client.query(
      `
      INSERT INTO bookings (
        user_id,
        event_type_id,
        guest_name,
        guest_email,
        guest_timezone,
        start_at,
        end_at,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')
      RETURNING id, user_id, event_type_id, guest_name, guest_email, guest_timezone, start_at, end_at, status, created_at;
      `,
      [
        eventType.user_id,
        eventType.id,
        guestName,
        guestEmail.toLowerCase(),
        guestTimezone,
        startAt.toISOString(),
        endAt.toISOString(),
      ],
    );

    const inserted = insertRes.rows[0];

    if (customAnswers && customAnswers.length > 0) {
      for (const answer of customAnswers) {
        const text = answer.answer.trim();
        if (!text) continue;

        const questionRes = await client.query<{ id: number }>(
          `
          SELECT id
          FROM booking_questions
          WHERE id = $1 AND event_type_id = $2
          LIMIT 1
          `,
          [answer.questionId, eventType.id],
        );

        if (questionRes.rows.length === 0) {
          continue;
        }

        await client.query(
          `
          INSERT INTO booking_question_answers (booking_id, question_id, answer)
          VALUES ($1, $2, $3)
          ON CONFLICT (booking_id, question_id)
          DO UPDATE SET answer = EXCLUDED.answer;
          `,
          [inserted.id, answer.questionId, text],
        );
      }
    }
    const emailMetaRes = await client.query<{
      event_title: string;
      host_name: string;
    }>(
      `
      SELECT e.title AS event_title, u.name AS host_name
      FROM event_types e
      INNER JOIN users u ON u.id = e.user_id
      WHERE e.id = $1
      LIMIT 1
      `,
      [eventType.id],
    );

    await client.query("COMMIT");

    const emailMeta = emailMetaRes.rows[0];
    if (emailMeta) {
      dispatchBookingNotification(
        {
          type: "confirmed",
          recipientEmail: inserted.guest_email,
          recipientName: inserted.guest_name,
          eventTitle: emailMeta.event_title,
          startAtIso: inserted.start_at,
          endAtIso: inserted.end_at,
          hostName: emailMeta.host_name,
        },
        "booking-confirmed",
      );
    }

    return inserted;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function rescheduleBooking({
  bookingId,
  selectedDateTime,
}: RescheduleBookingInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const bookingRes = await client.query<{
      id: number;
      user_id: number;
      event_type_id: number;
      status: string;
      duration_minutes: number;
      buffer_minutes: number;
    }>(
      `
      SELECT b.id, b.user_id, b.event_type_id, b.status,
             EXTRACT(EPOCH FROM (b.end_at - b.start_at)) / 60 AS duration_minutes,
             e.buffer_minutes
      FROM bookings b
      INNER JOIN event_types e ON e.id = b.event_type_id
      WHERE b.id = $1
      LIMIT 1
      `,
      [bookingId],
    );

    if (bookingRes.rows.length === 0) {
      const error = new Error("Booking not found") as Error & {
        status?: number;
      };
      error.status = 404;
      throw error;
    }

    const booking = bookingRes.rows[0];
    if (booking.status !== "confirmed") {
      const error = new Error(
        "Only confirmed bookings can be rescheduled",
      ) as Error & {
        status?: number;
      };
      error.status = 400;
      throw error;
    }

    const startAt = new Date(selectedDateTime);
    const endAt = addMinutes(startAt, Number(booking.duration_minutes));

    if (Number.isNaN(startAt.getTime())) {
      const error = new Error("Invalid selectedDateTime") as Error & {
        status?: number;
      };
      error.status = 400;
      throw error;
    }

    const conflictRes = await client.query<{ id: number }>(
      `
      SELECT b.id
      FROM bookings b
      INNER JOIN event_types e ON e.id = b.event_type_id
      WHERE b.user_id = $1
        AND b.id <> $2
        AND b.status = 'confirmed'
        AND tstzrange(
              b.start_at - make_interval(mins => e.buffer_minutes),
              b.end_at + make_interval(mins => e.buffer_minutes),
              '[)'
            )
            &&
            tstzrange(
              $3::timestamptz - make_interval(mins => $5::int),
              $4::timestamptz + make_interval(mins => $5::int),
              '[)'
            )
      LIMIT 1
      `,
      [
        booking.user_id,
        bookingId,
        startAt.toISOString(),
        endAt.toISOString(),
        Number(booking.buffer_minutes) || 0,
      ],
    );

    if (conflictRes.rows.length > 0) {
      const error = new Error("Slot already booked") as Error & {
        status?: number;
      };
      error.status = 409;
      throw error;
    }

    const result = await client.query(
      `
      UPDATE bookings
      SET start_at = $2, end_at = $3
      WHERE id = $1
      RETURNING id, user_id, event_type_id, guest_name, guest_email, guest_timezone, start_at, end_at, status, created_at;
      `,
      [bookingId, startAt.toISOString(), endAt.toISOString()],
    );

    const updated = result.rows[0];
    const emailMetaRes = await client.query<{
      event_title: string;
      host_name: string;
    }>(
      `
      SELECT e.title AS event_title, u.name AS host_name
      FROM event_types e
      INNER JOIN users u ON u.id = e.user_id
      WHERE e.id = $1
      LIMIT 1
      `,
      [updated.event_type_id],
    );

    await client.query("COMMIT");

    const emailMeta = emailMetaRes.rows[0];
    if (emailMeta) {
      dispatchBookingNotification(
        {
          type: "rescheduled",
          recipientEmail: updated.guest_email,
          recipientName: updated.guest_name,
          eventTitle: emailMeta.event_title,
          startAtIso: updated.start_at,
          endAtIso: updated.end_at,
          hostName: emailMeta.host_name,
        },
        "booking-rescheduled",
      );
    }

    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export { createBooking, rescheduleBooking };
