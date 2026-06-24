ALTER TABLE loop_events ADD COLUMN IF NOT EXISTS is_anonymous boolean not null default false;
