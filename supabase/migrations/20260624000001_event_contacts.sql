alter table loop_events add column contacts jsonb default '[]'::jsonb;
