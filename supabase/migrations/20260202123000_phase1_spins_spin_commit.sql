/*
  Phase 1 — Spin audit + authoritative wallet updates via service-only RPC.

  Client calls Edge Function `spin` (JWT). Edge computes outcome and invokes `spin_commit_internal` with the service role.

  Do not grant execute on spin_commit_internal to anon or authenticated.
*/

-- ---------------------------------------------------------------------------
-- Wallet: bonus meter (must match server-side spin evaluation)
-- ---------------------------------------------------------------------------
alter table public.wallets
  add column if not exists bonus_meter_progress smallint not null default 0;

alter table public.wallets drop constraint if exists wallets_bonus_meter_progress_range;

alter table public.wallets
  add constraint wallets_bonus_meter_progress_range
  check (bonus_meter_progress >= 0 and bonus_meter_progress < 100);

comment on column public.wallets.bonus_meter_progress is '0–99; advances on each spin; payout when crossing 100 (carry remainder).';

-- ---------------------------------------------------------------------------
-- Slot catalog + spin audit
-- ---------------------------------------------------------------------------
create table public.slot_machines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.slot_machines (slug, name)
values ('default', 'Lucky Slots Classic')
on conflict (slug) do nothing;

create table public.spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot_machine_id uuid not null references public.slot_machines (id) on delete restrict,
  client_request_id uuid not null,
  bet bigint not null check (bet > 0),
  used_free_spin boolean not null default false,
  grid jsonb not null,
  result_summary jsonb not null,
  coin_balance_after bigint not null check (coin_balance_after >= 0),
  free_spin_balance_after integer not null check (free_spin_balance_after >= 0),
  bonus_progress_after smallint not null check (bonus_progress_after >= 0 and bonus_progress_after < 100),
  created_at timestamptz not null default now(),
  unique (user_id, client_request_id)
);

create index spins_user_created_idx on public.spins (user_id, created_at desc);

comment on table public.spins is 'Append-only spin outcomes; idempotent on (user_id, client_request_id).';

-- ---------------------------------------------------------------------------
-- RLS (read-only for players)
-- ---------------------------------------------------------------------------
alter table public.slot_machines enable row level security;
alter table public.spins enable row level security;

create policy slot_machines_select_active
  on public.slot_machines for select
  to authenticated
  using (active = true);

create policy spins_select_own
  on public.spins for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on table public.slot_machines to authenticated;
grant select on table public.spins to authenticated;

-- ---------------------------------------------------------------------------
-- Service-role-only commit (called from Edge Function)
-- ---------------------------------------------------------------------------
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

  if p_bet not in (10, 25, 50, 100, 250, 500) then
    raise exception 'invalid_bet';
  end if;

  select coalesce((p_result_summary->>'total_win')::bigint, -1) into v_summary_total;
  select coalesce((p_result_summary->>'bonus_meter_payout')::bigint, -1) into v_summary_bonus;

  if v_summary_total < 0 or v_summary_total > p_bet * 100000 then
    raise exception 'invalid_total_win';
  end if;

  if v_summary_bonus < 0 or v_summary_bonus > 10000 then
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

  select * into w from public.wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'wallet_not_found';
  end if;

  if p_used_free_spin then
    if w.free_spin_balance < 1 then
      raise exception 'no_free_spins';
    end if;
    v_coin := w.coin_balance - 0 + v_summary_total + v_summary_bonus;
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

  update public.wallets
  set
    coin_balance = v_coin,
    free_spin_balance = v_fs,
    bonus_meter_progress = p_bonus_progress_after,
    updated_at = now()
  where user_id = p_user_id;

  if not p_used_free_spin and p_bet > 0 then
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
      'spin_bet',
      'coins',
      -p_bet,
      w.coin_balance - p_bet,
      'spin',
      p_client_request_id,
      jsonb_build_object('bet', p_bet)
    );
  end if;

  if v_summary_total > 0 then
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
      'spin_win',
      'coins',
      v_summary_total,
      w.coin_balance - (case when p_used_free_spin then 0 else p_bet end) + v_summary_total,
      'spin',
      p_client_request_id,
      p_result_summary
    );
  end if;

  if v_summary_bonus > 0 then
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
      'bonus_meter_full',
      'coins',
      v_summary_bonus,
      v_coin,
      'spin',
      p_client_request_id,
      jsonb_build_object('payout', v_summary_bonus)
    );
  end if;

  insert into public.spins (
    user_id,
    slot_machine_id,
    client_request_id,
    bet,
    used_free_spin,
    grid,
    result_summary,
    coin_balance_after,
    free_spin_balance_after,
    bonus_progress_after
  )
  values (
    p_user_id,
    v_machine_id,
    p_client_request_id,
    p_bet,
    p_used_free_spin,
    p_grid,
    p_result_summary,
    p_coin_balance_after,
    p_free_spin_balance_after,
    p_bonus_progress_after
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

comment on function public.spin_commit_internal is 'Apply spin outcome to wallet + ledger + spins; idempotent; Edge/service_role only.';

revoke all on function public.spin_commit_internal(
  uuid, uuid, text, bigint, boolean, jsonb, jsonb, bigint, integer, smallint
) from public;

grant execute on function public.spin_commit_internal(
  uuid, uuid, text, bigint, boolean, jsonb, jsonb, bigint, integer, smallint
) to service_role;
