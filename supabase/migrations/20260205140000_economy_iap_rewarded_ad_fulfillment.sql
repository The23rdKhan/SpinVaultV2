/*
  IAP fulfillment + rewarded ad grants (service_role RPCs only).

  - economy_fulfill_iap_internal: idempotent on purchases.store_transaction_id (RevenueCat / store txn id).
  - economy_grant_rewarded_ad_internal: idempotent on wallet_ledger.request_id (deterministic UUID from Edge).

  Seeds products.sku to match mobile shop logical ids; replace SKUs in RevenueCat + stores to match.
*/

-- ---------------------------------------------------------------------------
-- Product catalog (coin packs + starter bundle) — totals include bonuses where applicable
-- ---------------------------------------------------------------------------
insert into public.products (sku, store, grant_coins, grant_free_spins, is_active, metadata)
values
  ('starter', 'both', 1000, 0, true, '{"kind":"coin_pack"}'::jsonb),
  ('basic', 'both', 5500, 0, true, '{"kind":"coin_pack"}'::jsonb),
  ('popular', 'both', 18000, 0, true, '{"kind":"coin_pack"}'::jsonb),
  ('premium', 'both', 65000, 0, true, '{"kind":"coin_pack"}'::jsonb),
  ('ultimate', 'both', 200000, 0, true, '{"kind":"coin_pack"}'::jsonb),
  ('starter_bundle', 'both', 10000, 10, true, '{"kind":"starter_pack"}'::jsonb)
on conflict (sku) do update set
  grant_coins = excluded.grant_coins,
  grant_free_spins = excluded.grant_free_spins,
  is_active = excluded.is_active,
  metadata = excluded.metadata;

-- ---------------------------------------------------------------------------
-- purchases.updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists purchases_set_updated_at on public.purchases;
create trigger purchases_set_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- economy_fulfill_iap_internal
-- ---------------------------------------------------------------------------
create or replace function public.economy_fulfill_iap_internal(
  p_user_id uuid,
  p_store_transaction_id text,
  p_product_sku text,
  p_revenuecat_customer_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
  prod record;
  pur record;
  v_txn text;
  v_sku text;
  v_new_coin bigint;
  v_new_fs integer;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_user');
  end if;

  v_txn := nullif(trim(p_store_transaction_id), '');
  v_sku := nullif(trim(p_product_sku), '');

  if v_txn is null or v_sku is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  end if;

  select * into prod
  from public.products p
  where lower(trim(p.sku)) = lower(trim(v_sku)) and p.is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_product', 'sku', v_sku);
  end if;

  select * into pur from public.purchases where store_transaction_id = v_txn for update;

  if not found then
    insert into public.purchases (
      user_id,
      product_id,
      status,
      revenuecat_customer_id,
      store_transaction_id,
      metadata
    )
    values (
      p_user_id,
      prod.id,
      'pending',
      p_revenuecat_customer_id,
      v_txn,
      coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (store_transaction_id) do nothing;

    select * into pur from public.purchases where store_transaction_id = v_txn for update;
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'purchase_row_missing');
  end if;

  if pur.status = 'verified' then
    select * into w from public.wallets where user_id = pur.user_id;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'purchase_id', pur.id,
      'coin_balance', w.coin_balance,
      'free_spin_balance', w.free_spin_balance,
      'bonus_meter_progress', coalesce(w.bonus_meter_progress, 0)
    );
  end if;

  if pur.user_id <> p_user_id then
    return jsonb_build_object('ok', false, 'error', 'transaction_owner_mismatch');
  end if;

  select * into w from public.wallets where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  end if;

  if prod.grant_coins < 0 or prod.grant_free_spins < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_product_grants');
  end if;

  v_new_coin := w.coin_balance + prod.grant_coins;
  v_new_fs := w.free_spin_balance + prod.grant_free_spins;

  update public.wallets
  set
    coin_balance = v_new_coin,
    free_spin_balance = v_new_fs,
    updated_at = now()
  where id = w.id;

  if prod.grant_coins > 0 then
    insert into public.wallet_ledger (
      user_id,
      wallet_id,
      transaction_type,
      currency_type,
      amount,
      balance_after,
      reference_type,
      reference_id,
      metadata
    )
    values (
      p_user_id,
      w.id,
      'iap_grant',
      'coins',
      prod.grant_coins,
      v_new_coin,
      'iap',
      pur.id,
      jsonb_build_object('sku', v_sku, 'store_transaction_id', v_txn)
        || coalesce(p_metadata, '{}'::jsonb)
    );
  end if;

  if prod.grant_free_spins > 0 then
    insert into public.wallet_ledger (
      user_id,
      wallet_id,
      transaction_type,
      currency_type,
      amount,
      balance_after,
      reference_type,
      reference_id,
      metadata
    )
    values (
      p_user_id,
      w.id,
      'iap_grant_fs',
      'free_spins',
      prod.grant_free_spins,
      v_new_fs,
      'iap',
      pur.id,
      jsonb_build_object('sku', v_sku, 'store_transaction_id', v_txn)
    );
  end if;

  update public.purchases
  set
    status = 'verified',
    granted_at = coalesce(granted_at, now()),
    product_id = prod.id,
    revenuecat_customer_id = coalesce(p_revenuecat_customer_id, revenuecat_customer_id),
    metadata = coalesce(purchases.metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = pur.id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'purchase_id', pur.id,
    'coin_balance', v_new_coin,
    'free_spin_balance', v_new_fs,
    'bonus_meter_progress', coalesce(w.bonus_meter_progress, 0),
    'coins_granted', prod.grant_coins,
    'free_spins_granted', prod.grant_free_spins
  );
end;
$$;

comment on function public.economy_fulfill_iap_internal is 'Verify-once IAP credit; idempotent on purchases.store_transaction_id; Edge/service_role only.';

revoke all on function public.economy_fulfill_iap_internal(uuid, text, text, text, jsonb) from public;
grant execute on function public.economy_fulfill_iap_internal(uuid, text, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- economy_grant_rewarded_ad_internal
-- ---------------------------------------------------------------------------
create or replace function public.economy_grant_rewarded_ad_internal(
  p_user_id uuid,
  p_request_id uuid,
  p_granted_coins bigint,
  p_placement text default null,
  p_network text default 'admob',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
  v_new_coin bigint;
begin
  if p_user_id is null or p_request_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  end if;

  if p_granted_coins is null or p_granted_coins < 0 or p_granted_coins > 100000 then
    return jsonb_build_object('ok', false, 'error', 'invalid_reward_amount');
  end if;

  if exists (select 1 from public.wallet_ledger where request_id = p_request_id) then
    select * into w from public.wallets where user_id = p_user_id;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'wallet_not_found');
    end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'coin_balance', w.coin_balance,
      'free_spin_balance', w.free_spin_balance,
      'bonus_meter_progress', coalesce(w.bonus_meter_progress, 0),
      'granted_coins', 0
    );
  end if;

  select * into w from public.wallets where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  end if;

  v_new_coin := w.coin_balance + p_granted_coins;

  update public.wallets
  set coin_balance = v_new_coin, updated_at = now()
  where id = w.id;

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
    w.id,
    'rewarded_ad',
    'coins',
    p_granted_coins,
    v_new_coin,
    'rewarded_ad',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  insert into public.rewarded_ads (
    user_id,
    network,
    placement,
    request_id,
    granted_coins,
    metadata
  )
  values (
    p_user_id,
    coalesce(nullif(trim(p_network), ''), 'admob'),
    nullif(trim(p_placement), ''),
    p_request_id,
    p_granted_coins,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'coin_balance', v_new_coin,
    'free_spin_balance', w.free_spin_balance,
    'bonus_meter_progress', coalesce(w.bonus_meter_progress, 0),
    'granted_coins', p_granted_coins
  );
end;
$$;

comment on function public.economy_grant_rewarded_ad_internal is 'Idempotent rewarded-ad coin grant on wallet_ledger.request_id; Edge/service_role only.';

revoke all on function public.economy_grant_rewarded_ad_internal(uuid, uuid, bigint, text, text, jsonb) from public;
grant execute on function public.economy_grant_rewarded_ad_internal(uuid, uuid, bigint, text, text, jsonb) to service_role;
