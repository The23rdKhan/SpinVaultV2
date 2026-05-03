-- Phase 5 — Weekly leaderboard aggregates from spins (UTC week starting Monday).

create or replace function public.week_period_start_utc(d timestamptz)
returns date
language sql
immutable
as $$
  select (
    (timezone('utc', d))::date
    - ((extract(dow from timezone('utc', d))::integer + 6) % 7)
  )::date;
$$;

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  leaderboard_type text not null check (leaderboard_type in ('weekly_biggest_win', 'weekly_total_winnings')),
  period_start date not null,
  score bigint not null default 0 check (score >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, leaderboard_type, period_start)
);

create index leaderboard_entries_period_type_idx
  on public.leaderboard_entries (period_start desc, leaderboard_type, score desc);

alter table public.leaderboard_entries enable row level security;
create policy leaderboard_entries_select_all
  on public.leaderboard_entries for select
  to authenticated
  using (true);

grant select on public.leaderboard_entries to authenticated;
revoke insert, update, delete on public.leaderboard_entries from authenticated;

create or replace function public.trg_spins_update_leaderboard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := public.week_period_start_utc(NEW.created_at);
  v_win bigint := coalesce((NEW.result_summary->>'total_win')::bigint, 0);
begin
  insert into public.leaderboard_entries (user_id, leaderboard_type, period_start, score)
  values (NEW.user_id, 'weekly_total_winnings', v_period, v_win)
  on conflict (user_id, leaderboard_type, period_start)
  do update set
    score = public.leaderboard_entries.score + excluded.score,
    updated_at = now();

  insert into public.leaderboard_entries (user_id, leaderboard_type, period_start, score)
  values (NEW.user_id, 'weekly_biggest_win', v_period, v_win)
  on conflict (user_id, leaderboard_type, period_start)
  do update set
    score = greatest(public.leaderboard_entries.score, excluded.score),
    updated_at = now();

  return NEW;
end;
$$;

drop trigger if exists spins_leaderboard_after_insert on public.spins;
create trigger spins_leaderboard_after_insert
  after insert on public.spins
  for each row execute function public.trg_spins_update_leaderboard();

create or replace view public.v_leaderboard_public as
select
  row_number() over (
    partition by le.leaderboard_type, le.period_start
    order by le.score desc
  )::integer as rank,
  le.leaderboard_type,
  le.period_start,
  le.score as value,
  p.username,
  le.user_id
from public.leaderboard_entries le
join public.profiles p on p.id = le.user_id;

grant select on public.v_leaderboard_public to authenticated;

create table if not exists public.winner_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  win_type text not null,
  win_amount bigint not null,
  multiplier numeric,
  created_at timestamptz not null default now()
);

alter table public.winner_feed enable row level security;
create policy winner_feed_select_all on public.winner_feed for select to authenticated using (true);
grant select on public.winner_feed to authenticated;
revoke insert, update, delete on public.winner_feed from authenticated;

create or replace function public.trg_spins_winner_feed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := coalesce(NEW.result_summary->>'win_type', 'none');
  v_win bigint := coalesce((NEW.result_summary->>'total_win')::bigint, 0);
  v_mult numeric := coalesce((NEW.result_summary->>'win_multiplier')::numeric, 0);
begin
  if v_type in ('bigWin', 'megaWin', 'jackpot') and v_win > 0 then
    insert into public.winner_feed (user_id, win_type, win_amount, multiplier)
    values (NEW.user_id, v_type, v_win, v_mult);
  end if;
  return NEW;
end;
$$;

drop trigger if exists spins_winner_feed_after_insert on public.spins;
create trigger spins_winner_feed_after_insert
  after insert on public.spins
  for each row execute function public.trg_spins_winner_feed();

create table if not exists public.gift_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  gift_type text not null,
  payload jsonb not null default '{}'::jsonb,
  claimed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.gift_inbox enable row level security;
create policy gift_inbox_select_own on public.gift_inbox for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.gift_inbox to authenticated;
revoke insert, update, delete on public.gift_inbox from authenticated;
