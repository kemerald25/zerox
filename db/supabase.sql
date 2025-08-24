-- Supabase schema for TicTacToe data ops
-- Run this in Supabase SQL editor or via the CLI (psql) against your project

-- 1) Weekly leaderboard (one row per season+address)
create table if not exists public.leaderboard_entries (
  season text not null,
  address text not null,
  alias text,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  points integer not null default 0,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leaderboard_entries_pkey primary key (season, address)
);

create index if not exists leaderboard_entries_points_idx
  on public.leaderboard_entries (season, points desc, wins desc);

-- 2) Timed sprint leaderboard (10-min windows, one row per window_start+address)
create table if not exists public.sprint_entries (
  window_start bigint not null,
  address text not null,
  wins integer not null default 0,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sprint_entries_pkey primary key (window_start, address)
);

create index if not exists sprint_entries_rank_idx
  on public.sprint_entries (window_start, wins desc);

-- 3) Loss settlement gate (blocks gameplay until unpaid loss is settled)
create table if not exists public.loss_settlements (
  address text not null primary key,
  required boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Triggers to maintain updated_at columns
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_leaderboard_entries_touch'
  ) then
    create trigger trg_leaderboard_entries_touch
      before update on public.leaderboard_entries
      for each row execute function public.touch_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_sprint_entries_touch'
  ) then
    create trigger trg_sprint_entries_touch
      before update on public.sprint_entries
      for each row execute function public.touch_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_loss_settlements_touch'
  ) then
    create trigger trg_loss_settlements_touch
      before update on public.loss_settlements
      for each row execute function public.touch_updated_at();
  end if;
end $$;

-- RLS: Enable and allow anon read + upsert for MVP
-- Note: For stricter security, switch server code to use the service role key
--       and limit anon to SELECT only.
alter table public.leaderboard_entries enable row level security;
alter table public.sprint_entries enable row level security;
alter table public.loss_settlements enable row level security;

-- Policies (anon role)
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'lb_select_all') then
    create policy lb_select_all on public.leaderboard_entries for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'lb_upsert_anon') then
    create policy lb_upsert_anon on public.leaderboard_entries for insert with check (true);
    create policy lb_update_anon on public.leaderboard_entries for update using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'sprint_select_all') then
    create policy sprint_select_all on public.sprint_entries for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'sprint_upsert_anon') then
    create policy sprint_upsert_anon on public.sprint_entries for insert with check (true);
    create policy sprint_update_anon on public.sprint_entries for update using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'settlement_select_all') then
    create policy settlement_select_all on public.loss_settlements for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'settlement_upsert_anon') then
    create policy settlement_upsert_anon on public.loss_settlements for insert with check (true);
    create policy settlement_update_anon on public.loss_settlements for update using (true) with check (true);
  end if;
end $$;


