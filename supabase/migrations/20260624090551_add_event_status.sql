alter table loop_events add column if not exists status text default 'active' check (status in ('active', 'cancelled'));
