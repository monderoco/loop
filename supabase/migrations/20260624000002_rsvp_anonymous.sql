ALTER TABLE loop_rsvps ADD COLUMN IF NOT EXISTS is_anonymous boolean not null default false;
