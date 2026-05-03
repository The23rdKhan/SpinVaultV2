-- Server-authoritative daily login reward (day 1–7 ladder).
-- Payout schedule must match shared/economy/daily-login-rewards.ts

create or replace function public.economy_claim_daily_reward_internal(
  p_user_id uuid,
  p_request_id uuid,
  p_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet record;
  v_drs record;
  v_coins bigint;
  v_new_bal bigint;
  v_bonus integer;
  v_cb bigint;
  v_fs integer;
  v_bm integer;
  v_streak integer;
begin
  if p_day is null or p_day < 1 or p_day > 7 then
    return jsonb_build_object('ok', false, 'error', 'invalid_day');
  end if;

  -- Idempotent replay: same client request returns current wallet + streak.
  if exists (
    select 1 from public.wallet_ledger
    where request_id = p_request_id and user_id = p_user_id
  ) then
    select w.coin_balance, w.free_spin_balance, w.bonus_meter_progress, drs.current_streak
    into v_cb, v_fs, v_bm, v_streak
    from public.wallets w
    join public.daily_reward_state drs on drs.user_id = w.user_id
    where w.user_id = p_user_id;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'wallet_not_found');
    end if;

    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'coin_balance', v_cb,
      'free_spin_balance', v_fs,
      'bonus_meter_progress', coalesce(v_bm, 0),
      'daily_streak_after', v_streak,
      'coins_granted', 0,
      'claimed_day', p_day
    );
  end if;

  select * into v_wallet from public.wallets where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  end if;

  select * into v_drs from public.daily_reward_state where user_id = p_user_id for update;
  if not found then
    insert into public.daily_reward_state (user_id)
    values (p_user_id)
    returning * into v_drs;
  end if;

  if p_day <> coalesce(v_drs.current_streak, 0) + 1 then
    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_claim_sequence',
      'expected_day', coalesce(v_drs.current_streak, 0) + 1
    );
  end if;

  v_coins := case p_day
    when 1 then 100
    when 2 then 200
    when 3 then 350
    when 4 then 500
    when 5 then 750
    when 6 then 1000
    when 7 then 2500
    else 0
  end;

  v_new_bal := v_wallet.coin_balance + v_coins;
  v_bonus := coalesce(v_wallet.bonus_meter_progress, 0);

  update public.wallets
  set
    coin_balance = v_new_bal,
    updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_type,
    currency_type,
    amount,
    balance_after,
    reference_type,
    request_id,
    metadata
  )
  values (
    p_user_id,
    v_wallet.id,
    'daily_reward_claim',
    'coins',
    v_coins,
    v_new_bal,
    'daily_login',
    p_request_id,
    jsonb_build_object('day', p_day)
  );

  update public.daily_reward_state
  set
    current_streak = p_day,
    current_day = least(7, p_day + 1),
    last_claimed_at = now(),
    weekly_progress = greatest(weekly_progress, p_day),
    updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'coin_balance', v_new_bal,
    'free_spin_balance', v_wallet.free_spin_balance,
    'bonus_meter_progress', v_bonus,
    'daily_streak_after', p_day,
    'coins_granted', v_coins,
    'claimed_day', p_day
  );
end;
$$;

comment on function public.economy_claim_daily_reward_internal(uuid, uuid, integer) is
  'Credits daily login reward; idempotent via wallet_ledger.request_id; service_role only.';

revoke all on function public.economy_claim_daily_reward_internal(uuid, uuid, integer) from public;
grant execute on function public.economy_claim_daily_reward_internal(uuid, uuid, integer) to service_role;
