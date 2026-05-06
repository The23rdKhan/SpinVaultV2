/*
  Leaderboard Materialization — pre-growth scalability fix.

  Problem
  ───────
  v_leaderboard_public computes row_number() over the full leaderboard_entries
  partition on EVERY query — both the top-20 pull and the self-entry lookup.
  At 5 K users that is 10 K rows sorted per page-load; at 50 K it becomes
  600 K rows sorted, with a 3-way join against profiles + player_saves.

  Solution
  ────────
  1. leaderboard_snapshot  — materialised table; mirrors v_leaderboard_public columns
                             + a `snapshot_at` timestamp.  Rows for ALL entries in
                             the current period (not just top-20) so self-entry
                             queries also hit the fast path.
  2. refresh_leaderboard_snapshot() — recomputes ranks with a single window-function
                             query and upserts results.  Idempotent; safe to call
                             manually at any time.
  3. v_leaderboard_public  — replaced to read from leaderboard_snapshot.  App
                             queries are unchanged; they still SELECT from the same
                             view with the same column names.
  4. pg_cron job           — runs refresh_leaderboard_snapshot() every 5 minutes.
                             Requires pg_cron extension (available on Supabase Pro).
                             The cron block is wrapped in a DO so the migration is
                             safe to apply even when pg_cron is not yet enabled;
                             enable it in the dashboard first, then re-run if needed.

  Staleness trade-off
  ───────────────────
  Ranks lag by at most 5 minutes.  For a social casino leaderboard this is fine;
  players are not making real-money decisions based on live rank position.  If you
  want sub-minute freshness in the future, switch to REFRESH MATERIALIZED VIEW
  CONCURRENTLY (requires a unique index) or call refresh_leaderboard_snapshot()
  directly from the spin Edge Function after jackpot hits.

  App impact
  ──────────
  Zero.  v_leaderboard_public column names and types are unchanged.
*/

-- ===========================================================================
-- 1. Snapshot table
-- ===========================================================================
create table if not exists public.leaderboard_snapshot (
  user_id          uuid    not null references public.profiles (id) on delete cascade,
  leaderboard_type text    not null check (leaderboard_type in ('weekly_biggest_win', 'weekly_total_winnings')),
  period_start     date    not null,
  rank             integer not null check (rank >= 1),
  value            bigint  not null default 0,
  username         text    not null default 'Player',
  frame            text,
  title            text,
  pet              text,
  snapshot_at      timestamptz not null default now(),
  primary key (user_id, leaderboard_type, period_start)
);

-- Index optimised for the two query shapes the app issues:
--   (a) top-20: WHERE period_start = $p AND leaderboard_type = $t ORDER BY rank LIMIT 20
--   (b) self:   WHERE period_start = $p AND leaderboard_type = $t AND user_id = $uid
create index if not exists leaderboard_snapshot_period_type_rank_idx
  on public.leaderboard_snapshot (period_start desc, leaderboard_type, rank asc);

create index if not exists leaderboard_snapshot_user_period_idx
  on public.leaderboard_snapshot (user_id, period_start desc, leaderboard_type);

comment on table public.leaderboard_snapshot is
  'Pre-materialised weekly leaderboard with server-computed ranks. '
  'Refreshed every 5 minutes by pg_cron. Read via v_leaderboard_public.';

-- RLS: authenticated users may read all rows (same policy as leaderboard_entries).
alter table public.leaderboard_snapshot enable row level security;

create policy leaderboard_snapshot_select_all
  on public.leaderboard_snapshot for select
  to authenticated
  using (true);

grant select on public.leaderboard_snapshot to authenticated;
revoke insert, update, delete on public.leaderboard_snapshot from authenticated;

-- ===========================================================================
-- 2. Refresh function
-- ===========================================================================
create or replace function public.refresh_leaderboard_snapshot()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  /*
    Recompute ranks for every leaderboard_entries row in the current week's
    period, then upsert into leaderboard_snapshot.

    The window function here is intentional — it runs ONCE per 5-minute job
    instead of once per user page-load, which is the entire point.

    We refresh only the current period to keep the query bounded.  Historical
    periods are already correct; scores from past weeks never change.
  */
  insert into public.leaderboard_snapshot (
    user_id,
    leaderboard_type,
    period_start,
    rank,
    value,
    username,
    frame,
    title,
    pet,
    snapshot_at
  )
  select
    le.user_id,
    le.leaderboard_type,
    le.period_start,
    row_number() over (
      partition by le.leaderboard_type, le.period_start
      order by le.score desc, le.updated_at asc, le.user_id asc
    )::integer                                           as rank,
    le.score                                             as value,
    coalesce(nullif(trim(p.username), ''), 'Player')     as username,
    nullif(ps.payload->>'equippedFrameId', '')           as frame,
    nullif(ps.payload->>'equippedTitleId', '')           as title,
    nullif(ps.payload->>'equippedPetId', '')             as pet,
    now()                                                as snapshot_at
  from public.leaderboard_entries le
  join public.profiles p on p.id = le.user_id
  left join public.player_saves ps on ps.user_id = le.user_id
  where le.period_start = public.week_period_start_utc(now())
  on conflict (user_id, leaderboard_type, period_start)
  do update set
    rank        = excluded.rank,
    value       = excluded.value,
    username    = excluded.username,
    frame       = excluded.frame,
    title       = excluded.title,
    pet         = excluded.pet,
    snapshot_at = excluded.snapshot_at;
end;
$$;

comment on function public.refresh_leaderboard_snapshot is
  'Recomputes and upserts the current week''s leaderboard ranks into '
  'leaderboard_snapshot.  Called by pg_cron every 5 minutes and safe to '
  'invoke manually (e.g. after a jackpot hit for near-instant update).';

-- Service role and postgres superuser can call it; not exposed to clients.
revoke all on function public.refresh_leaderboard_snapshot() from public;
grant execute on function public.refresh_leaderboard_snapshot() to service_role;

-- ===========================================================================
-- 3. Populate snapshot immediately so the view is never empty after migration
-- ===========================================================================
select public.refresh_leaderboard_snapshot();

-- ===========================================================================
-- 4. Replace v_leaderboard_public to read from the snapshot
--    Column names and types are unchanged — app queries require no edits.
-- ===========================================================================
create or replace view public.v_leaderboard_public as
select
  rank,
  leaderboard_type,
  period_start,
  value,
  username,
  user_id,
  frame,
  title,
  pet
from public.leaderboard_snapshot;

comment on view public.v_leaderboard_public is
  'Weekly leaderboard with pre-materialised ranks sourced from leaderboard_snapshot. '
  'Ranks are accurate to within 5 minutes. App queries unchanged.';

grant select on public.v_leaderboard_public to authenticated;

-- ===========================================================================
-- 5. pg_cron job — refresh every 5 minutes
--
--    Requires: pg_cron extension enabled in Supabase dashboard
--              (Database → Extensions → pg_cron).
--
--    If pg_cron is not yet enabled this block will raise a notice and skip
--    gracefully.  Enable the extension, then call:
--        SELECT cron.schedule(
--          'refresh-leaderboard-snapshot',
--          '*/5 * * * *',
--          $$SELECT public.refresh_leaderboard_snapshot()$$
--        );
-- ===========================================================================
do $outer$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) then
    -- Remove any previously registered job with the same name before re-adding
    -- (only if it already exists — unschedule raises on a missing job name).
    if exists (select 1 from cron.job where jobname = 'refresh-leaderboard-snapshot') then
      perform cron.unschedule('refresh-leaderboard-snapshot');
    end if;

    perform cron.schedule(
      'refresh-leaderboard-snapshot',
      '*/5 * * * *',
      'select public.refresh_leaderboard_snapshot()'
    );

    raise notice 'pg_cron job "refresh-leaderboard-snapshot" scheduled (every 5 min).';
  else
    raise notice
      'pg_cron is not enabled. Enable it in the Supabase dashboard under '
      'Database → Extensions → pg_cron, then run: '
      'SELECT cron.schedule(''refresh-leaderboard-snapshot'', ''*/5 * * * *'', '
      '''select public.refresh_leaderboard_snapshot()'');';
  end if;
end $outer$;

-- ===========================================================================
-- 6. Cosmetic: also refresh snapshot after every jackpot for near-instant
--    winner visibility in the leaderboard wall.
--    This trigger fires after winner_feed INSERT (jackpot rows only).
-- ===========================================================================
create or replace function public.trg_winner_feed_refresh_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only refresh on jackpot hits — big-win / mega-win refreshes can wait
  -- for the 5-minute cron.
  if NEW.win_type = 'jackpot' then
    perform public.refresh_leaderboard_snapshot();
  end if;
  return NEW;
end;
$$;

drop trigger if exists winner_feed_refresh_snapshot on public.winner_feed;
create trigger winner_feed_refresh_snapshot
  after insert on public.winner_feed
  for each row
  execute function public.trg_winner_feed_refresh_snapshot();

comment on trigger winner_feed_refresh_snapshot on public.winner_feed is
  'Force-refreshes leaderboard_snapshot on jackpot hits so the winner appears '
  'in the leaderboard wall within seconds rather than up to 5 minutes.';
