/*
  Phase 2 — Missions catalog + per-user progress, daily wheel state, spin trigger,
  internal economy RPCs (service_role via Edge `economy` only).
*/

-- ---------------------------------------------------------------------------
-- Missions
-- ---------------------------------------------------------------------------
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  mission_key text not null unique,
  title text not null,
  description text not null,
  mission_type text not null check (mission_type in ('spin_count', 'win_count', 'max_bet_once')),
  target_value integer not null check (target_value > 0),
  reward_coins bigint not null check (reward_coins >= 0),
  reward_free_spins integer not null default 0 check (reward_free_spins >= 0),
  reset_period text not null default 'daily' check (reset_period in ('daily')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.missions (mission_key, title, description, mission_type, target_value, reward_coins, reward_free_spins, reset_period, is_active)
values
  ('spin20', 'Spin Master', 'Complete 20 spins', 'spin_count', 20, 500, 0, 'daily', true),
  ('win5', 'Lucky Streak', 'Win 5 times', 'win_count', 5, 300, 0, 'daily', true),
  ('maxbet1', 'High Roller', 'Use Max Bet once', 'max_bet_once', 1, 200, 0, 'daily', true)
on conflict (mission_key) do update set
  title = excluded.title,
  description = excluded.description,
  mission_type = excluded.mission_type,
  target_value = excluded.target_value,
  reward_coins = excluded.reward_coins,
  reward_free_spins = excluded.reward_free_spins,
  is_active = excluded.is_active;

create table if not exists public.user_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  period_start date not null,
  progress integer not null default 0 check (progress >= 0),
  completed boolean not null default false,
  claimed boolean not null default false,
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id, period_start)
);

create index user_missions_user_period_idx on public.user_missions (user_id, period_start desc);

-- ---------------------------------------------------------------------------
-- Daily wheel (one claim per UTC calendar day)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_wheel_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_claim_utc_date date,
  last_reward_coins bigint,
  updated_at timestamptz not null default now()
);

drop trigger if exists daily_wheel_state_set_updated_at on public.daily_wheel_state;
create trigger daily_wheel_state_set_updated_at
  before update on public.daily_wheel_state
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.missions enable row level security;
alter table public.user_missions enable row level security;
alter table public.daily_wheel_state enable row level security;

drop policy if exists missions_select_active on public.missions;
create policy missions_select_active
  on public.missions for select
  to authenticated
  using (is_active = true);

drop policy if exists user_missions_select_own on public.user_missions;
create policy user_missions_select_own
  on public.user_missions for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists daily_wheel_state_select_own on public.daily_wheel_state;
create policy daily_wheel_state_select_own
  on public.daily_wheel_state for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.missions to authenticated;
grant select on public.user_missions to authenticated;
grant select on public.daily_wheel_state to authenticated;

revoke insert, update, delete on public.missions from authenticated;
revoke insert, update, delete on public.user_missions from authenticated;
revoke insert, update, delete on public.daily_wheel_state from authenticated;

-- ---------------------------------------------------------------------------
-- Lazy-insert mission rows for UTC day
-- ---------------------------------------------------------------------------
create or replace function public.ensure_user_missions_for_day(p_user_id uuid, p_day date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_missions (user_id, mission_id, period_start, progress, completed, claimed)
  select p_user_id, m.id, p_day, 0, false, false
  from public.missions m
  where m.is_active = true and m.reset_period = 'daily'
  on conflict (user_id, mission_id, period_start) do nothing;
end;
$$;

revoke all on function public.ensure_user_missions_for_day(uuid, date) from public;
grant execute on function public.ensure_user_missions_for_day(uuid, date) to service_role;

-- ---------------------------------------------------------------------------
-- After spin: advance mission progress (UTC day bucket)
-- ---------------------------------------------------------------------------
create or replace function public.trg_spins_update_missions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (NEW.created_at at time zone 'utc')::date;
  v_win boolean := coalesce((NEW.result_summary->>'total_win')::bigint, 0) > 0;
  v_max_bet boolean := NEW.bet >= 500;
begin
  perform public.ensure_user_missions_for_day(NEW.user_id, v_day);

  update public.user_missions um
  set
    progress = least(m.target_value, um.progress + 1),
    completed = least(m.target_value, um.progress + 1) >= m.target_value,
    completed_at = case
      when least(m.target_value, um.progress + 1) >= m.target_value and um.completed_at is null then now()
      else um.completed_at
    end
  from public.missions m
  where um.user_id = NEW.user_id
    and um.mission_id = m.id
    and um.period_start = v_day
    and m.mission_key = 'spin20'
    and m.mission_type = 'spin_count'
    and not um.claimed;

  if v_win then
    update public.user_missions um
    set
      progress = least(m.target_value, um.progress + 1),
      completed = least(m.target_value, um.progress + 1) >= m.target_value,
      completed_at = case
        when least(m.target_value, um.progress + 1) >= m.target_value and um.completed_at is null then now()
        else um.completed_at
      end
    from public.missions m
    where um.user_id = NEW.user_id
      and um.mission_id = m.id
      and um.period_start = v_day
      and m.mission_key = 'win5'
      and m.mission_type = 'win_count'
      and not um.claimed;
  end if;

  if v_max_bet then
    update public.user_missions um
    set
      progress = least(m.target_value, um.progress + 1),
      completed = least(m.target_value, um.progress + 1) >= m.target_value,
      completed_at = case
        when least(m.target_value, um.progress + 1) >= m.target_value and um.completed_at is null then now()
        else um.completed_at
      end
    from public.missions m
    where um.user_id = NEW.user_id
      and um.mission_id = m.id
      and um.period_start = v_day
      and m.mission_key = 'maxbet1'
      and m.mission_type = 'max_bet_once'
      and not um.claimed;
  end if;

  return NEW;
end;
$$;

drop trigger if exists spins_missions_after_insert on public.spins;
create trigger spins_missions_after_insert
  after insert on public.spins
  for each row execute function public.trg_spins_update_missions();

-- ---------------------------------------------------------------------------
-- Internal: spin daily wheel (matches mobile WHEEL_REWARDS distribution — uniform)
-- ---------------------------------------------------------------------------
create or replace function public.economy_spin_daily_wheel_internal(
  p_user_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet record;
  v_today date := (timezone('utc', now()))::date;
  v_reward bigint;
  v_new_bal bigint;
  v_wheel record;
  v_amts bigint[] := array[50, 100, 150, 200, 300, 500, 750, 1000];
begin
  if p_user_id is null or p_request_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  end if;

  if exists (
    select 1 from public.wallet_ledger
    where request_id = p_request_id and user_id = p_user_id
  ) then
    select w.coin_balance, w.free_spin_balance, w.bonus_meter_progress
    into v_wallet
    from public.wallets w where w.user_id = p_user_id;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'wallet_not_found');
    end if;
    select last_reward_coins, last_claim_utc_date into v_wheel from public.daily_wheel_state where user_id = p_user_id;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'coin_balance', v_wallet.coin_balance,
      'free_spin_balance', v_wallet.free_spin_balance,
      'bonus_meter_progress', coalesce(v_wallet.bonus_meter_progress, 0),
      'reward_coins', coalesce(v_wheel.last_reward_coins, 0),
      'claim_date', v_wheel.last_claim_utc_date
    );
  end if;

  select * into v_wheel from public.daily_wheel_state where user_id = p_user_id for update;
  if found and v_wheel.last_claim_utc_date = v_today then
    return jsonb_build_object('ok', false, 'error', 'daily_wheel_already_claimed', 'claim_date', v_today);
  end if;

  select * into v_wallet from public.wallets where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  end if;

  -- random pick among 8 rewards (uniform)
  v_reward := v_amts[1 + (floor(random() * 8)::int)];

  v_new_bal := v_wallet.coin_balance + v_reward;

  update public.wallets
  set coin_balance = v_new_bal, updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_ledger (
    user_id, wallet_id, transaction_type, currency_type, amount, balance_after,
    reference_type, request_id, metadata
  ) values (
    p_user_id, v_wallet.id, 'daily_wheel', 'coins', v_reward, v_new_bal,
    'daily_wheel', p_request_id, jsonb_build_object('claim_utc_date', v_today)
  );

  insert into public.daily_wheel_state (user_id, last_claim_utc_date, last_reward_coins)
  values (p_user_id, v_today, v_reward)
  on conflict (user_id) do update set
    last_claim_utc_date = excluded.last_claim_utc_date,
    last_reward_coins = excluded.last_reward_coins,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'coin_balance', v_new_bal,
    'free_spin_balance', v_wallet.free_spin_balance,
    'bonus_meter_progress', coalesce(v_wallet.bonus_meter_progress, 0),
    'reward_coins', v_reward,
    'claim_date', v_today
  );
end;
$$;

revoke all on function public.economy_spin_daily_wheel_internal(uuid, uuid) from public;
grant execute on function public.economy_spin_daily_wheel_internal(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Internal: claim mission reward
-- ---------------------------------------------------------------------------
create or replace function public.economy_claim_mission_internal(
  p_user_id uuid,
  p_request_id uuid,
  p_mission_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet record;
  v_um record;
  v_m record;
  v_today date := (timezone('utc', now()))::date;
  v_new_bal bigint;
  v_new_fs integer;
begin
  if p_user_id is null or p_request_id is null or p_mission_key is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  end if;

  if exists (
    select 1 from public.wallet_ledger
    where request_id = p_request_id and user_id = p_user_id
  ) then
    select w.coin_balance, w.free_spin_balance, w.bonus_meter_progress into v_wallet
    from public.wallets w where w.user_id = p_user_id;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'coin_balance', v_wallet.coin_balance,
      'free_spin_balance', v_wallet.free_spin_balance,
      'bonus_meter_progress', coalesce(v_wallet.bonus_meter_progress, 0),
      'mission_key', p_mission_key,
      'coins_granted', 0,
      'free_spins_granted', 0
    );
  end if;

  select * into v_m from public.missions where mission_key = p_mission_key and is_active = true;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_mission');
  end if;

  perform public.ensure_user_missions_for_day(p_user_id, v_today);

  select * into v_um
  from public.user_missions
  where user_id = p_user_id and mission_id = v_m.id and period_start = v_today
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'mission_row_missing');
  end if;

  if not v_um.completed then
    return jsonb_build_object('ok', false, 'error', 'mission_not_completed');
  end if;

  if v_um.claimed then
    return jsonb_build_object('ok', false, 'error', 'mission_already_claimed');
  end if;

  select * into v_wallet from public.wallets where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  end if;

  v_new_bal := v_wallet.coin_balance + v_m.reward_coins;
  v_new_fs := v_wallet.free_spin_balance + v_m.reward_free_spins;

  update public.wallets
  set
    coin_balance = v_new_bal,
    free_spin_balance = v_new_fs,
    updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_ledger (
    user_id, wallet_id, transaction_type, currency_type, amount, balance_after,
    reference_type, reference_id, request_id, metadata
  ) values (
    p_user_id,
    v_wallet.id,
    'mission_reward',
    'coins',
    v_m.reward_coins,
    v_new_bal,
    'mission',
    v_m.id,
    p_request_id,
    jsonb_build_object('mission_key', p_mission_key, 'period_start', v_today)
  );

  -- For currency_type = free_spins, `amount` and `balance_after` are free-spin counts (not coins).
  if v_m.reward_free_spins > 0 then
    insert into public.wallet_ledger (
      user_id, wallet_id, transaction_type, currency_type, amount, balance_after,
      reference_type, reference_id, request_id, metadata
    ) values (
      p_user_id,
      v_wallet.id,
      'mission_reward_fs',
      'free_spins',
      v_m.reward_free_spins,
      v_new_fs,
      'mission',
      v_m.id,
      gen_random_uuid(),
      jsonb_build_object('mission_key', p_mission_key)
    );
  end if;

  update public.user_missions
  set claimed = true, claimed_at = now()
  where id = v_um.id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'coin_balance', v_new_bal,
    'free_spin_balance', v_new_fs,
    'bonus_meter_progress', coalesce(v_wallet.bonus_meter_progress, 0),
    'mission_key', p_mission_key,
    'coins_granted', v_m.reward_coins,
    'free_spins_granted', v_m.reward_free_spins
  );
end;
$$;

revoke all on function public.economy_claim_mission_internal(uuid, uuid, text) from public;
grant execute on function public.economy_claim_mission_internal(uuid, uuid, text) to service_role;

-- pg_cron: optional on hosted Supabase; mission rows roll per UTC day lazily via trigger + ensures.
-- Uncomment locally if extension available:
-- create extension if not exists pg_cron;

comment on table public.user_missions is 'Daily mission progress; period_start is UTC date.';
comment on function public.economy_spin_daily_wheel_internal is 'One wheel claim per UTC day; Edge/service_role only.';
