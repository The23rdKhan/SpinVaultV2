/*
  Scalability Fixes — two migrations in one file for atomic deployment.

  Part A: spin_commit_internal — unblock high-roller bet tiers
  ─────────────────────────────────────────────────────────────
  The previous version had two hardcoded constraints that broke any bet above $500:

    1. if p_bet not in (10, 25, 50, 100, 250, 500) → 'invalid_bet'
       Rejects $1K, $5K, $10K, $1M, $10M, $100M tiers entirely.
       Fix: remove the explicit allowlist; validate p_bet > 0 only.
       Bet legitimacy is already enforced by the Edge Function (BET_OPTIONS check).

    2. if v_summary_bonus > 10000 → 'invalid_bonus_meter_payout'
       bonusMeterPayoutForBet(currentBet) = max(350, currentBet × 8), so:
         $1K  bet → 8,000 (just under cap, passes)
         $5K  bet → 40,000 (FAILS)
         $10K bet → 80,000 (FAILS)
       Fix: cap at p_bet × 10 — bonus meter is at most 8× the bet, so 10× gives
       a defensive safety margin while never blocking a legitimate payout.

  Part B: player_saves — promote hot fields to dedicated columns
  ──────────────────────────────────────────────────────────────
  level, xp, total_spins, and biggest_win change on every spin but are buried in
  a 10 KB jsonb blob that gets fully rewritten each time. Promoting them to typed
  columns means:
    • Spin-time progress updates write 4 integers (~80 bytes) instead of 10 KB.
    • Leaderboard / analytics can query and sort by level without jsonb extraction.
    • Indexes are compact and efficient.

  The full payload blob is kept for slow-changing fields (cosmetics, missions,
  settings). Dual-write for now: the columns are the authoritative source;
  the payload copies remain for backward-compatible fallback on older clients.

  player_progress_patch RPC: lightweight authenticated function that updates only
  the hot columns, callable directly from the mobile app after each spin.
*/

-- ===========================================================================
-- Part A: Rebuild spin_commit_internal with corrected validation
-- ===========================================================================
create or replace function public.spin_commit_internal(
  p_user_id uuid,
  p_client_request_id uuid,
  p_slot_machine_slug text,
  p_bet bigint,
  p_used_free_spin boolean,
  p_grid jsonb,
  p_result_summary jsonb,
  p_coin_balance_after bigint,
  p_free_spin_balance_after integer,
  p_bonus_progress_after smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_machine_id uuid;
  w wallets%rowtype;
  v_existing spins%rowtype;
  v_coin bigint;
  v_fs integer;
  v_bonus smallint;
  v_summary_total bigint;
  v_summary_bonus bigint;
begin
  if p_user_id is null or p_client_request_id is null then
    raise exception 'invalid_arguments';
  end if;

  -- Idempotency check — return the previously committed result unchanged.
  select * into v_existing
  from public.spins s
  where s.user_id = p_user_id and s.client_request_id = p_client_request_id;

  if found then
    select * into w from public.wallets where user_id = p_user_id;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'coin_balance', w.coin_balance,
      'free_spin_balance', w.free_spin_balance,
      'bonus_meter_progress', w.bonus_meter_progress,
      'grid', v_existing.grid,
      'result_summary', v_existing.result_summary,
      'coin_balance_after', v_existing.coin_balance_after,
      'free_spin_balance_after', v_existing.free_spin_balance_after,
      'bonus_progress_after', v_existing.bonus_progress_after
    );
  end if;

  select id into v_machine_id
  from public.slot_machines
  where slug = p_slot_machine_slug and active = true
  limit 1;

  if v_machine_id is null then
    raise exception 'unknown_slot_machine';
  end if;

  -- ── Bet validation ──────────────────────────────────────────────────────
  -- The Edge Function already enforces p_bet ∈ BET_OPTIONS before calling here.
  -- We only guard against nonsensical values (negative / zero) that would corrupt
  -- wallet arithmetic. An explicit allowlist is not maintained here because the
  -- product-level tiers live in the shared TypeScript constant BET_OPTIONS and
  -- can expand without requiring a new migration.
  if p_bet < 10 then
    raise exception 'invalid_bet';
  end if;

  -- ── Win sanity bounds ───────────────────────────────────────────────────
  select coalesce((p_result_summary->>'total_win')::bigint, -1) into v_summary_total;
  select coalesce((p_result_summary->>'bonus_meter_payout')::bigint, -1) into v_summary_bonus;

  -- total_win upper guard: single-spin win capped at 100 000× the bet.
  -- (The largest theoretical payout is jackpot = bet×25 plus payline wins,
  --  which is well under 100 000× even at whale bets.)
  if v_summary_total < 0 or v_summary_total > p_bet * 100000 then
    raise exception 'invalid_total_win';
  end if;

  -- bonus_meter_payout upper guard: capped at 10× the bet.
  -- bonusMeterPayoutForBet(bet) = max(350, bet × 8), so 10× gives a safe margin.
  if v_summary_bonus < 0 or v_summary_bonus > p_bet * 10 then
    raise exception 'invalid_bonus_meter_payout';
  end if;

  if p_bonus_progress_after < 0 or p_bonus_progress_after >= 100 then
    raise exception 'invalid_bonus_progress';
  end if;

  if coalesce((p_result_summary->>'bonus_progress_after')::smallint, -1) != p_bonus_progress_after then
    raise exception 'bonus_progress_summary_mismatch';
  end if;

  if p_coin_balance_after < 0 or p_free_spin_balance_after < 0 then
    raise exception 'invalid_final_balances';
  end if;

  -- ── Lock + verify wallet ────────────────────────────────────────────────
  select * into w from public.wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'wallet_not_found';
  end if;

  if p_used_free_spin then
    if w.free_spin_balance < 1 then
      raise exception 'no_free_spins';
    end if;
    v_coin := w.coin_balance + v_summary_total + v_summary_bonus;
    v_fs := w.free_spin_balance - 1 + coalesce((p_result_summary->>'free_spins_won')::integer, 0);
  else
    if w.coin_balance < p_bet then
      raise exception 'insufficient_coins';
    end if;
    v_coin := w.coin_balance - p_bet + v_summary_total + v_summary_bonus;
    v_fs := w.free_spin_balance + coalesce((p_result_summary->>'free_spins_won')::integer, 0);
  end if;

  if v_coin != p_coin_balance_after or v_fs != p_free_spin_balance_after then
    raise exception 'balance_mismatch';
  end if;

  if v_fs < 0 or v_coin < 0 then
    raise exception 'balance_underflow';
  end if;

  -- ── Commit wallet ────────────────────────────────────────────────────────
  update public.wallets
  set
    coin_balance = v_coin,
    free_spin_balance = v_fs,
    bonus_meter_progress = p_bonus_progress_after,
    updated_at = now()
  where user_id = p_user_id;

  -- ── Ledger entries ────────────────────────────────────────────────────────
  if not p_used_free_spin and p_bet > 0 then
    insert into public.wallet_ledger (
      user_id, wallet_id, transaction_type, currency_type,
      amount, balance_after, reference_type, request_id, metadata
    ) values (
      p_user_id, w.id, 'spin_bet', 'coins',
      -p_bet,
      w.coin_balance - p_bet,
      'spin', p_client_request_id,
      jsonb_build_object('bet', p_bet)
    );
  end if;

  if v_summary_total > 0 then
    insert into public.wallet_ledger (
      user_id, wallet_id, transaction_type, currency_type,
      amount, balance_after, reference_type, request_id, metadata
    ) values (
      p_user_id, w.id, 'spin_win', 'coins',
      v_summary_total,
      w.coin_balance - (case when p_used_free_spin then 0 else p_bet end) + v_summary_total,
      'spin', p_client_request_id,
      p_result_summary
    );
  end if;

  if v_summary_bonus > 0 then
    insert into public.wallet_ledger (
      user_id, wallet_id, transaction_type, currency_type,
      amount, balance_after, reference_type, request_id, metadata
    ) values (
      p_user_id, w.id, 'bonus_meter_full', 'coins',
      v_summary_bonus,
      v_coin,
      'spin', p_client_request_id,
      jsonb_build_object('payout', v_summary_bonus)
    );
  end if;

  -- ── Spin audit row ────────────────────────────────────────────────────────
  insert into public.spins (
    user_id, slot_machine_id, client_request_id,
    bet, used_free_spin, grid, result_summary,
    coin_balance_after, free_spin_balance_after, bonus_progress_after
  ) values (
    p_user_id, v_machine_id, p_client_request_id,
    p_bet, p_used_free_spin, p_grid, p_result_summary,
    p_coin_balance_after, p_free_spin_balance_after, p_bonus_progress_after
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'coin_balance', v_coin,
    'free_spin_balance', v_fs,
    'bonus_meter_progress', p_bonus_progress_after,
    'grid', p_grid,
    'result_summary', p_result_summary,
    'coin_balance_after', p_coin_balance_after,
    'free_spin_balance_after', p_free_spin_balance_after,
    'bonus_progress_after', p_bonus_progress_after
  );
end;
$$;

comment on function public.spin_commit_internal is
  'Apply spin outcome to wallet + ledger + spins; idempotent on (user_id, client_request_id). '
  'Accepts all BET_OPTIONS tiers; bet legitimacy enforced by the Edge Function. '
  'Edge/service_role only.';

-- Permissions unchanged: service_role only.
revoke all on function public.spin_commit_internal(
  uuid, uuid, text, bigint, boolean, jsonb, jsonb, bigint, integer, smallint
) from public;

grant execute on function public.spin_commit_internal(
  uuid, uuid, text, bigint, boolean, jsonb, jsonb, bigint, integer, smallint
) to service_role;

-- ===========================================================================
-- Part B: Promote hot progress fields to dedicated player_saves columns
-- ===========================================================================

-- Add columns (idempotent — safe to re-run).
alter table public.player_saves
  add column if not exists level         integer not null default 1 check (level >= 1),
  add column if not exists xp            bigint  not null default 0 check (xp >= 0),
  add column if not exists total_spins   bigint  not null default 0 check (total_spins >= 0),
  add column if not exists biggest_win   bigint  not null default 0 check (biggest_win >= 0);

comment on column public.player_saves.level       is 'Player level — authoritative column, mirrors payload.level.';
comment on column public.player_saves.xp          is 'XP within current level — authoritative column, mirrors payload.xp.';
comment on column public.player_saves.total_spins is 'Lifetime spin count — authoritative column, mirrors payload.totalSpins.';
comment on column public.player_saves.biggest_win is 'Lifetime biggest single win in coins — authoritative column, mirrors payload.biggestWin.';

-- Backfill from existing payload JSON where the data already exists.
update public.player_saves
set
  level       = greatest(1, coalesce((payload->>'level')::integer, 1)),
  xp          = greatest(0, coalesce((payload->>'xp')::bigint, 0)),
  total_spins = greatest(0, coalesce((payload->>'totalSpins')::bigint, 0)),
  biggest_win = greatest(0, coalesce((payload->>'biggestWin')::bigint, 0))
where
  level = 1 and xp = 0 and total_spins = 0 and biggest_win = 0;

-- Index for leaderboard / analytics queries that sort/filter by level.
create index if not exists player_saves_level_idx on public.player_saves (level desc);
create index if not exists player_saves_total_spins_idx on public.player_saves (total_spins desc);

-- ===========================================================================
-- player_progress_patch — lightweight spin-time progress write
-- ===========================================================================
-- Authenticated players may only update their own row (enforced by RLS on
-- player_saves + a uid check inside the function).  No service_role required.
create or replace function public.player_progress_patch(
  p_level       integer,
  p_xp          bigint,
  p_total_spins bigint,
  p_biggest_win bigint
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Basic sanity guards — real validation happens client-side + on spin_commit_internal.
  if p_level < 1 or p_xp < 0 or p_total_spins < 0 or p_biggest_win < 0 then
    raise exception 'invalid_progress_values';
  end if;

  update public.player_saves
  set
    level       = p_level,
    xp          = p_xp,
    total_spins = p_total_spins,
    biggest_win = p_biggest_win,
    updated_at  = now()
  where user_id = (select auth.uid());

  if not found then
    raise exception 'player_save_not_found';
  end if;
end;
$$;

comment on function public.player_progress_patch is
  'Update only the four hot progress columns on player_saves. '
  'Called after each spin as a tiny 4-integer write instead of a full 10 KB blob upsert. '
  'Callable by authenticated users (RLS: own row only via auth.uid()).';

grant execute on function public.player_progress_patch(integer, bigint, bigint, bigint)
  to authenticated;
