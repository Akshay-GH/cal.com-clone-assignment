import express from "express";
import { z } from "zod";

import { pool } from "../../db/pool";
import { validateBody } from "../../middleware/validate";
import { createBooking, rescheduleBooking } from "../../services/bookings";
import { getAvailableSlots } from "../../services/slots";

const router = express.Router();

const bookingSchema = z.object({
  eventTypeId: z.number().int().positive(),
  guestName: z.string().min(1).max(255),
  guestEmail: z.string().email(),
  guestTimezone: z.string().min(2).max(64),
  selectedDateTime: z.string().datetime(),
  customAnswers: z
    .array(
      z.object({
        questionId: z.number().int().positive(),
        answer: z.string().max(2000),
      }),
    )
    .optional(),
});

const rescheduleSchema = z.object({
  selectedDateTime: z.string().datetime(),
});

router.get("/:username", async (req, res, next) => {
  try {
    const { username } = req.params;

    const userRes = await pool.query<{
      id: number;
      name: string;
      slug: string;
      timezone: string;
    }>(`SELECT id, name, slug, timezone FROM users WHERE slug = $1 LIMIT 1`, [
      username,
    ]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "Host not found" });
    }

    const user = userRes.rows[0];
    const eventsRes = await pool.query(
      `
      SELECT id, title, description, duration_minutes AS "durationMinutes", slug
      FROM event_types
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY created_at DESC
      `,
      [user.id],
    );

    res.json({ user, eventTypes: eventsRes.rows });
  } catch (error) {
    next(error);
  }
});

router.get("/:username/:eventSlug/slots", async (req, res, next) => {
  try {
    const { username, eventSlug } = req.params;
    const date = String(req.query.date || "");
    const timezone = String(req.query.timezone || "UTC");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ error: "Invalid date format. Expected YYYY-MM-DD" });
    }

    const eventRes = await pool.query<{ id: number; user_id: number }>(
      `
      SELECT e.id, e.user_id
      FROM event_types e
      INNER JOIN users u ON u.id = e.user_id
      WHERE u.slug = $1 AND e.slug = $2 AND e.is_active = TRUE
      LIMIT 1
      `,
      [username, eventSlug],
    );

    if (eventRes.rows.length === 0) {
      return res.status(404).json({ error: "Event type not found" });
    }

    const event = eventRes.rows[0];
    const slots = await getAvailableSlots({
      userId: event.user_id,
      eventTypeId: event.id,
      date,
      timezone,
    });

    res.json({ date, timezone, slots });
  } catch (error) {
    next(error);
  }
});

router.get("/:username/:eventSlug/details", async (req, res, next) => {
  try {
    const { username, eventSlug } = req.params;

    const eventRes = await pool.query<{
      id: number;
      title: string;
      description: string;
      durationMinutes: number;
      slug: string;
      bufferMinutes: number;
    }>(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.duration_minutes AS "durationMinutes",
        e.slug,
        e.buffer_minutes AS "bufferMinutes"
      FROM event_types e
      INNER JOIN users u ON u.id = e.user_id
      WHERE u.slug = $1 AND e.slug = $2 AND e.is_active = TRUE
      LIMIT 1
      `,
      [username, eventSlug],
    );

    if (eventRes.rows.length === 0) {
      return res.status(404).json({ error: "Event type not found" });
    }

    const event = eventRes.rows[0];
    const questionsRes = await pool.query<{
      id: number;
      question: string;
      inputType: "text" | "textarea";
      isRequired: boolean;
      position: number;
    }>(
      `
      SELECT
        id,
        question,
        input_type AS "inputType",
        is_required AS "isRequired",
        position
      FROM booking_questions
      WHERE event_type_id = $1
      ORDER BY position ASC, id ASC
      `,
      [event.id],
    );

    res.json({ event, questions: questionsRes.rows });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/bookings",
  validateBody(bookingSchema),
  async (req, res, next) => {
    try {
      const booking = await createBooking(
        req.validatedBody as z.infer<typeof bookingSchema>,
      );
      res.status(201).json(booking);
    } catch (error) {
      const dbError = error as {
        code?: string;
        status?: number;
        message?: string;
      };
      if (dbError.code === "23P01") {
        dbError.status = 409;
        dbError.message = "Slot already booked";
      }
      next(error);
    }
  },
);

router.get("/bookings/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const bookingRes = await pool.query(
      `
      SELECT
        b.id,
        b.guest_name AS "guestName",
        b.guest_email AS "guestEmail",
        b.guest_timezone AS "guestTimezone",
        b.start_at AS "startAt",
        b.end_at AS "endAt",
        b.status,
        e.title AS "eventTitle",
        u.name AS "hostName"
      FROM bookings b
      INNER JOIN event_types e ON e.id = b.event_type_id
      INNER JOIN users u ON u.id = b.user_id
      WHERE b.id = $1
      LIMIT 1
      `,
      [id],
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(bookingRes.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/bookings/:id/reschedule",
  validateBody(rescheduleSchema),
  async (req, res, next) => {
    try {
      const bookingId = Number(req.params.id);
      const payload = req.validatedBody as z.infer<typeof rescheduleSchema>;
      const booking = await rescheduleBooking({
        bookingId,
        selectedDateTime: payload.selectedDateTime,
      });
      res.json(booking);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
