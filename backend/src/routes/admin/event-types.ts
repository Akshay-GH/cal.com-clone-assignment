import express from "express";
import { z } from "zod";

import { pool } from "../../db/pool";
import { validateBody } from "../../middleware/validate";

const router = express.Router();
const DEFAULT_USER_ID = 1;

const eventTypeSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(3000).optional().default(""),
  durationMinutes: z.number().int().min(15).max(480),
  bufferMinutes: z.number().int().min(0).max(180).default(0),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
});

const eventTypeUpdateSchema = eventTypeSchema.partial();

const questionSchema = z.object({
  question: z.string().min(3).max(300),
  inputType: z.enum(["text", "textarea"]).default("text"),
  isRequired: z.boolean().default(false),
});

router.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.duration_minutes AS "durationMinutes",
        e.buffer_minutes AS "bufferMinutes",
        e.slug,
        e.is_active AS "isActive",
        e.created_at AS "createdAt",
        u.slug AS "hostSlug"
      FROM event_types e
      INNER JOIN users u ON u.id = e.user_id
      WHERE e.user_id = $1
      ORDER BY e.created_at DESC
      `,
      [DEFAULT_USER_ID],
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", validateBody(eventTypeSchema), async (req, res, next) => {
  try {
    const payload = req.validatedBody as z.infer<typeof eventTypeSchema>;

    const result = await pool.query(
      `
      INSERT INTO event_types (user_id, title, description, duration_minutes, slug, buffer_minutes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, description, duration_minutes AS "durationMinutes", buffer_minutes AS "bufferMinutes", slug, is_active AS "isActive", created_at AS "createdAt";
      `,
      [
        DEFAULT_USER_ID,
        payload.title,
        payload.description,
        payload.durationMinutes,
        payload.slug,
        payload.bufferMinutes,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    const dbError = error as {
      code?: string;
      status?: number;
      message?: string;
    };
    if (dbError.code === "23505") {
      dbError.status = 409;
      dbError.message = "Event slug already exists";
    }
    next(error);
  }
});

router.patch(
  "/:id",
  validateBody(eventTypeUpdateSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const payload = req.validatedBody as z.infer<
        typeof eventTypeUpdateSchema
      >;

      const existing = await pool.query(
        `SELECT * FROM event_types WHERE id = $1 AND user_id = $2`,
        [id, DEFAULT_USER_ID],
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: "Event type not found" });
      }

      const current = existing.rows[0];
      const result = await pool.query(
        `
      UPDATE event_types
      SET
        title = $3,
        description = $4,
        duration_minutes = $5,
        buffer_minutes = $6,
        slug = $7,
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id, title, description, duration_minutes AS "durationMinutes", buffer_minutes AS "bufferMinutes", slug, is_active AS "isActive", created_at AS "createdAt";
      `,
        [
          id,
          DEFAULT_USER_ID,
          payload.title ?? current.title,
          payload.description ?? current.description,
          payload.durationMinutes ?? current.duration_minutes,
          payload.bufferMinutes ?? current.buffer_minutes,
          payload.slug ?? current.slug,
        ],
      );

      res.json(result.rows[0]);
    } catch (error) {
      const dbError = error as {
        code?: string;
        status?: number;
        message?: string;
      };
      if (dbError.code === "23505") {
        dbError.status = 409;
        dbError.message = "Event slug already exists";
      }
      next(error);
    }
  },
);

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      `DELETE FROM event_types WHERE id = $1 AND user_id = $2`,
      [id, DEFAULT_USER_ID],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event type not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/:id/questions", async (req, res, next) => {
  try {
    const eventTypeId = Number(req.params.id);
    const result = await pool.query<{
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
      [eventTypeId],
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:id/questions",
  validateBody(questionSchema),
  async (req, res, next) => {
    try {
      const eventTypeId = Number(req.params.id);
      const payload = req.validatedBody as z.infer<typeof questionSchema>;

      const positionRes = await pool.query<{ nextPosition: number }>(
        `
        SELECT COALESCE(MAX(position), -1) + 1 AS "nextPosition"
        FROM booking_questions
        WHERE event_type_id = $1
        `,
        [eventTypeId],
      );

      const nextPosition = Number(positionRes.rows[0]?.nextPosition || 0);
      const result = await pool.query(
        `
        INSERT INTO booking_questions (event_type_id, question, input_type, is_required, position)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
        `,
        [
          eventTypeId,
          payload.question,
          payload.inputType,
          payload.isRequired,
          nextPosition,
        ],
      );

      res.status(201).json({ id: result.rows[0].id });
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/:id/questions/:questionId", async (req, res, next) => {
  try {
    const eventTypeId = Number(req.params.id);
    const questionId = Number(req.params.questionId);

    const result = await pool.query(
      `
      DELETE FROM booking_questions
      WHERE id = $1 AND event_type_id = $2
      `,
      [questionId, eventTypeId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
