CREATE TABLE IF NOT EXISTS availability_schedules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_schedules_default
  ON availability_schedules(user_id)
  WHERE is_default = TRUE;

CREATE TABLE IF NOT EXISTS availability_schedule_slots (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES availability_schedules(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_schedule_slots_schedule
  ON availability_schedule_slots(schedule_id);

INSERT INTO availability_schedules (user_id, name, timezone, is_default)
SELECT u.id, 'Default Schedule', u.timezone, TRUE
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM availability_schedules s WHERE s.user_id = u.id
);

INSERT INTO availability_schedule_slots (schedule_id, day_of_week, start_time, end_time, is_available)
SELECT s.id, a.day_of_week, a.start_time, a.end_time, a.is_available
FROM availabilities a
INNER JOIN availability_schedules s
  ON s.user_id = a.user_id AND s.is_default = TRUE
ON CONFLICT (schedule_id, day_of_week)
DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_available = EXCLUDED.is_available,
  updated_at = NOW();
