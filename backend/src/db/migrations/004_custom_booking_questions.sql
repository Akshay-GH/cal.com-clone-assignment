CREATE TABLE IF NOT EXISTS booking_questions (
  id SERIAL PRIMARY KEY,
  event_type_id INTEGER NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  input_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (input_type IN ('text', 'textarea')),
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_questions_event
  ON booking_questions(event_type_id, position);

CREATE TABLE IF NOT EXISTS booking_question_answers (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES booking_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_answers_booking
  ON booking_question_answers(booking_id);
