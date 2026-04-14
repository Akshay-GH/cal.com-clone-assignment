import express from "express";

import { pool } from "../../db/pool";
import { sendBookingNotification } from "../../services/notifications";

const router = express.Router();
const DEFAULT_USER_ID = 1;

router.get("/", async (req, res, next) => {
  try {
    const type = req.query.type === "past" ? "past" : "upcoming";
    const operator = type === "past" ? "<" : ">=";

    const result = await pool.query(
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
        e.slug AS "eventSlug"
      FROM bookings b
      INNER JOIN event_types e ON e.id = b.event_type_id
      WHERE b.user_id = $1
        AND b.start_at ${operator} NOW()
      ORDER BY b.start_at ${type === "past" ? "DESC" : "ASC"}
      `,
      [DEFAULT_USER_ID],
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/cancel", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const result = await pool.query(
      `
      UPDATE bookings
      SET status = 'cancelled', cancelled_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id, status;
      `,
      [id, DEFAULT_USER_ID],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const notifyRes = await pool.query<{
      guest_name: string;
      guest_email: string;
      start_at: string;
      end_at: string;
      event_title: string;
      host_name: string;
    }>(
      `
      SELECT
        b.guest_name,
        b.guest_email,
        b.start_at,
        b.end_at,
        e.title AS event_title,
        u.name AS host_name
      FROM bookings b
      INNER JOIN event_types e ON e.id = b.event_type_id
      INNER JOIN users u ON u.id = b.user_id
      WHERE b.id = $1
      LIMIT 1
      `,
      [id],
    );

    const notify = notifyRes.rows[0];
    if (notify) {
      try {
        await sendBookingNotification({
          type: "cancelled",
          recipientEmail: notify.guest_email,
          recipientName: notify.guest_name,
          eventTitle: notify.event_title,
          startAtIso: notify.start_at,
          endAtIso: notify.end_at,
          hostName: notify.host_name,
        });
      } catch (notificationError) {
        console.error("Failed to send cancellation email", notificationError);
      }
    }

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
