import { pool } from "./pool";

type EventTypeRow = {
  id: number;
  duration_minutes: number;
};

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query<{ id: number }>(
      `
      INSERT INTO users (name, email, slug, timezone)
      VALUES ('Demo User', 'demo@cal.test', 'demo-user', 'UTC')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
      `,
    );

    const userId = userResult.rows[0].id;

    await client.query(
      `
      INSERT INTO event_types (user_id, title, description, duration_minutes, slug)
      VALUES
        ($1, '30 Min Intro Call', 'A quick intro conversation.', 30, 'intro-call'),
        ($1, '60 Min Deep Dive', 'Longer product and planning session.', 60, 'deep-dive')
      ON CONFLICT (user_id, slug) DO UPDATE
      SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        duration_minutes = EXCLUDED.duration_minutes,
        updated_at = NOW();
      `,
      [userId],
    );

    for (let day = 1; day <= 5; day += 1) {
      await client.query(
        `
        INSERT INTO availabilities (user_id, day_of_week, start_time, end_time, is_available)
        VALUES ($1, $2, '09:00', '17:00', TRUE)
        ON CONFLICT (user_id, day_of_week) DO UPDATE
        SET start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            is_available = EXCLUDED.is_available,
            updated_at = NOW();
        `,
        [userId, day],
      );
    }

    const eventResult = await client.query<EventTypeRow>(
      `SELECT id, duration_minutes FROM event_types WHERE user_id = $1 ORDER BY id ASC LIMIT 1`,
      [userId],
    );

    if (eventResult.rows.length > 0) {
      const eventType = eventResult.rows[0];
      const now = new Date();
      const upcomingStart = new Date(now);
      upcomingStart.setUTCDate(now.getUTCDate() + 1);
      upcomingStart.setUTCHours(10, 0, 0, 0);

      const upcomingEnd = new Date(
        upcomingStart.getTime() + eventType.duration_minutes * 60 * 1000,
      );

      const pastStart = new Date(now);
      pastStart.setUTCDate(now.getUTCDate() - 2);
      pastStart.setUTCHours(11, 0, 0, 0);
      const pastEnd = new Date(
        pastStart.getTime() + eventType.duration_minutes * 60 * 1000,
      );

      await client.query(
        `
        INSERT INTO bookings (user_id, event_type_id, guest_name, guest_email, guest_timezone, start_at, end_at, status)
        VALUES
          ($1, $2, 'Alice Example', 'alice@example.com', 'America/New_York', $3, $4, 'confirmed'),
          ($1, $2, 'Bob Example', 'bob@example.com', 'Europe/London', $5, $6, 'confirmed')
        ON CONFLICT DO NOTHING;
        `,
        [
          userId,
          eventType.id,
          upcomingStart.toISOString(),
          upcomingEnd.toISOString(),
          pastStart.toISOString(),
          pastEnd.toISOString(),
        ],
      );
    }

    await client.query("COMMIT");
    console.log("Seed completed");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error: unknown) => {
  console.error("Seed failed", error);
  process.exit(1);
});
