-- Authoritative weekly leaderboard projection for the mobile rewards screen.
--
-- This extends the existing public leaderboard view so the client can render
-- real rows without inventing placeholder vanity data or local rank estimates.

create or replace view public.v_leaderboard_public as
select
  row_number() over (
    partition by le.leaderboard_type, le.period_start
    order by le.score desc, le.updated_at asc, le.user_id asc
  )::integer as rank,
  le.leaderboard_type,
  le.period_start,
  le.score as value,
  coalesce(nullif(trim(p.username), ''), 'Player') as username,
  le.user_id,
  nullif(ps.payload->>'equippedFrameId', '') as frame,
  nullif(ps.payload->>'equippedTitleId', '') as title,
  nullif(ps.payload->>'equippedPetId', '') as pet
from public.leaderboard_entries le
join public.profiles p on p.id = le.user_id
left join public.player_saves ps on ps.user_id = le.user_id;

comment on view public.v_leaderboard_public is
  'Public weekly leaderboard projection with server-computed rank plus display cosmetics from player_saves.';

grant select on public.v_leaderboard_public to authenticated;
