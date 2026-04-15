import express from "express";
import { z } from "zod";

import { pool } from "../../db/pool";
import { validateBody } from "../../middleware/validate";

const router = express.Router();
const DEFAULT_USER_ID = 1;

const availabilityItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  isAvailable: z.boolean(),
});

const availabilitySchema = z.object({
  scheduleId: z.number().int().positive(),
  timezone: z.string().min(2).max(64),
  items: z.array(availabilityItemSchema).min(1).max(7),
});

const createScheduleSchema = z.object({
  name: z.string().min(2).max(120),
  timezone: z.string().min(2).max(64).optional(),
});

const dateOverrideSchema = z.object({
  overrideDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isBlocked: z.boolean(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
});

router.get("/", async (_req, res, next) => {
  try {
    const requestedScheduleId = Number((_req.query.scheduleId as string) || 0);

    const scheduleRes = await pool.query<{
      id: number;
      name: string;
      timezone: string;
      isDefault: boolean;
    }>(
      `
      SELECT id, name, timezone, is_default AS "isDefault"
      FROM availability_schedules
      WHERE user_id = $1
      ORDER BY is_default DESC, id ASC
      `,
      [DEFAULT_USER_ID],
    );

    const schedules = scheduleRes.rows;
    let activeScheduleId = requestedScheduleId;
    if (!activeScheduleId) {
      activeScheduleId =
        schedules.find((item) => item.isDefault)?.id || schedules[0]?.id || 0;
    }

    const availabilityRes = activeScheduleId
      ? await pool.query(
          `
      SELECT day_of_week AS "dayOfWeek", TO_CHAR(start_time, 'HH24:MI') AS "startTime", TO_CHAR(end_time, 'HH24:MI') AS "endTime", is_available AS "isAvailable"
      FROM availability_schedule_slots
      WHERE schedule_id = $1
      ORDER BY day_of_week ASC
      `,
          [activeScheduleId],
        )
      : await pool.query(
          `
      SELECT day_of_week AS "dayOfWeek", TO_CHAR(start_time, 'HH24:MI') AS "startTime", TO_CHAR(end_time, 'HH24:MI') AS "endTime", is_available AS "isAvailable"
      FROM availabilities
      WHERE user_id = $1
      ORDER BY day_of_week ASC
      `,
          [DEFAULT_USER_ID],
        );

    const userRes = await pool.query<{ timezone: string }>(
      `SELECT timezone FROM users WHERE id = $1`,
      [DEFAULT_USER_ID],
    );

    const activeSchedule = schedules.find(
      (item) => item.id === activeScheduleId,
    );

    res.json({
      timezone: activeSchedule?.timezone || userRes.rows[0]?.timezone || "UTC",
      activeScheduleId,
      schedules,
      items: availabilityRes.rows,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/schedules",
  validateBody(createScheduleSchema),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const payload = req.validatedBody as z.infer<typeof createScheduleSchema>;
      await client.query("BEGIN");

      const baseScheduleRes = await client.query<{
        id: number;
        timezone: string;
      }>(
        `
      SELECT id, timezone
      FROM availability_schedules
      WHERE user_id = $1
      ORDER BY is_default DESC, id ASC
      LIMIT 1
      `,
        [DEFAULT_USER_ID],
      );

      const baseSchedule = baseScheduleRes.rows[0];
      const nextTimezone = payload.timezone || baseSchedule?.timezone || "UTC";

      const createdRes = await client.query<{
        id: number;
        name: string;
        timezone: string;
        isDefault: boolean;
      }>(
        `
      INSERT INTO availability_schedules (user_id, name, timezone, is_default)
      VALUES ($1, $2, $3, FALSE)
      RETURNING id, name, timezone, is_default AS "isDefault";
      `,
        [DEFAULT_USER_ID, payload.name, nextTimezone],
      );

      const createdSchedule = createdRes.rows[0];

      if (baseSchedule) {
        await client.query(
          `
        INSERT INTO availability_schedule_slots (schedule_id, day_of_week, start_time, end_time, is_available)
        SELECT $1, day_of_week, start_time, end_time, is_available
        FROM availability_schedule_slots
        WHERE schedule_id = $2
        ON CONFLICT (schedule_id, day_of_week)
        DO UPDATE SET
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          is_available = EXCLUDED.is_available,
          updated_at = NOW();
        `,
          [createdSchedule.id, baseSchedule.id],
        );
      } else {
        for (let day = 0; day <= 6; day += 1) {
          await client.query(
            `
          INSERT INTO availability_schedule_slots (schedule_id, day_of_week, start_time, end_time, is_available)
          VALUES ($1, $2, '09:00', '17:00', $3)
          ON CONFLICT (schedule_id, day_of_week)
          DO UPDATE SET
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            is_available = EXCLUDED.is_available,
            updated_at = NOW();
          `,
            [createdSchedule.id, day, day >= 1 && day <= 5],
          );
        }
      }

      await client.query("COMMIT");
      res.status(201).json(createdSchedule);
    } catch (error) {
      await client.query("ROLLBACK");
      const isDuplicateScheduleName =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "23505" &&
        "constraint" in error &&
        (error as { constraint?: string }).constraint ===
          "availability_schedules_user_id_name_key";

      if (isDuplicateScheduleName) {
        return res
          .status(409)
          .json({ error: "A schedule with this name already exists." });
      }
      next(error);
    } finally {
      client.release();
    }
  },
);

router.patch("/schedules/:id/default", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const scheduleId = Number(req.params.id);
    await client.query("BEGIN");

    await client.query(
      `UPDATE availability_schedules SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1`,
      [DEFAULT_USER_ID],
    );

    const updatedRes = await client.query<{ id: number }>(
      `
      UPDATE availability_schedules
      SET is_default = TRUE, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id;
      `,
      [scheduleId, DEFAULT_USER_ID],
    );

    if (updatedRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Schedule not found" });
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

router.delete("/schedules/:id", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const scheduleId = Number(req.params.id);
    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      return res.status(400).json({ error: "Invalid schedule id" });
    }

    await client.query("BEGIN");

    const targetRes = await client.query<{ isDefault: boolean }>(
      `
      SELECT is_default AS "isDefault"
      FROM availability_schedules
      WHERE id = $1 AND user_id = $2
      `,
      [scheduleId, DEFAULT_USER_ID],
    );

    if (targetRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Schedule not found" });
    }

    const allSchedulesRes = await client.query<{ id: number }>(
      `SELECT id FROM availability_schedules WHERE user_id = $1 ORDER BY id ASC`,
      [DEFAULT_USER_ID],
    );

    if (allSchedulesRes.rows.length <= 1) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cannot delete the only schedule" });
    }

    const isDeletingDefault = targetRes.rows[0].isDefault;

    await client.query(
      `DELETE FROM availability_schedules WHERE id = $1 AND user_id = $2`,
      [scheduleId, DEFAULT_USER_ID],
    );

    if (isDeletingDefault) {
      const nextDefault = allSchedulesRes.rows.find(
        (item) => item.id !== scheduleId,
      );
      if (nextDefault) {
        await client.query(
          `
          UPDATE availability_schedules
          SET is_default = TRUE, updated_at = NOW()
          WHERE id = $1 AND user_id = $2
          `,
          [nextDefault.id, DEFAULT_USER_ID],
        );
      }
    }

    await client.query("COMMIT");
    res.status(204).send();
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

router.get("/overrides", async (_req, res, next) => {
  try {
    const result = await pool.query<{
      id: number;
      overrideDate: string;
      startTime: string | null;
      endTime: string | null;
      isBlocked: boolean;
      reason: string | null;
    }>(
      `
      SELECT
        id,
        TO_CHAR(override_date, 'YYYY-MM-DD') AS "overrideDate",
        TO_CHAR(start_time, 'HH24:MI') AS "startTime",
        TO_CHAR(end_time, 'HH24:MI') AS "endTime",
        is_blocked AS "isBlocked",
        reason
      FROM date_overrides
      WHERE user_id = $1
      ORDER BY override_date ASC
      `,
      [DEFAULT_USER_ID],
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/overrides",
  validateBody(dateOverrideSchema),
  async (req, res, next) => {
    try {
      const payload = req.validatedBody as z.infer<typeof dateOverrideSchema>;
      const startTime = payload.isBlocked ? null : payload.startTime || null;
      const endTime = payload.isBlocked ? null : payload.endTime || null;

      const result = await pool.query(
        `
      INSERT INTO date_overrides (user_id, override_date, start_time, end_time, is_blocked)
      VALUES ($1, $2::date, $3, $4, $5)
      ON CONFLICT (user_id, override_date)
      DO UPDATE SET
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        is_blocked = EXCLUDED.is_blocked,
        updated_at = NOW()
      RETURNING id;
      `,
        [
          DEFAULT_USER_ID,
          payload.overrideDate,
          startTime,
          endTime,
          payload.isBlocked,
        ],
      );

      res.status(201).json({ id: result.rows[0].id });
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/overrides/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      `DELETE FROM date_overrides WHERE id = $1 AND user_id = $2`,
      [id, DEFAULT_USER_ID],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Override not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.put("/", validateBody(availabilitySchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { scheduleId, timezone, items } = req.validatedBody as z.infer<
      typeof availabilitySchema
    >;
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE availability_schedules
      SET timezone = $3, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      `,
      [scheduleId, DEFAULT_USER_ID, timezone],
    );

    await client.query(
      `UPDATE users SET timezone = $2, updated_at = NOW() WHERE id = $1`,
      [DEFAULT_USER_ID, timezone],
    );

    for (const item of items) {
      await client.query(
        `
        INSERT INTO availability_schedule_slots (schedule_id, day_of_week, start_time, end_time, is_available)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (schedule_id, day_of_week)
        DO UPDATE SET start_time = EXCLUDED.start_time,
                      end_time = EXCLUDED.end_time,
                      is_available = EXCLUDED.is_available,
                      updated_at = NOW();
        `,
        [
          scheduleId,
          item.dayOfWeek,
          item.startTime,
          item.endTime,
          item.isAvailable,
        ],
      );
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

export default router;
