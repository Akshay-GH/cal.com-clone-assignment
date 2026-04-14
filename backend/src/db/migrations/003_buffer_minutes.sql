ALTER TABLE event_types
ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0 AND buffer_minutes <= 180);
