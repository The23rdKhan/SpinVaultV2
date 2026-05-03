-- Phase 3 (partial) — Theme catalog + ownership; server spend mirrors mobile THEME_CONFIGS prices.

create table if not exists public.themes (
  slug text primary key,
  name text not null,
  price_coins bigint not null check (price_coins >= 0),
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.themes (slug, name, price_coins, is_default, is_active)
values
  ('vegas', 'Vegas Classic', 0, true, true),
  ('cyber', 'Cyber Neon', 5000, false, true),
  ('treasure', 'Treasure Cove', 7500, false, true)
on conflict (slug) do update set
  name = excluded.name,
  price_coins = excluded.price_coins,
  is_default = excluded.is_default,
  is_active = excluded.is_active;

create table if not exists public.user_themes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  theme_slug text not null references public.themes (slug) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, theme_slug)
);

alter table public.themes enable row level security;
alter table public.user_themes enable row level security;

drop policy if exists themes_select_active on public.themes;
create policy themes_select_active
  on public.themes for select
  to authenticated
  using (is_active = true);

drop policy if exists user_themes_select_own on public.user_themes;
create policy user_themes_select_own
  on public.user_themes for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.themes to authenticated;
grant select on public.user_themes to authenticated;
revoke insert, update, delete on public.themes from authenticated;
revoke insert, update, delete on public.user_themes from authenticated;

create or replace function public.economy_buy_theme_internal(
  p_user_id uuid,
  p_request_id uuid,
  p_theme_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet record;
  v_theme record;
  v_price bigint;
  v_new_bal bigint;
begin
  if p_user_id is null or p_request_id is null or p_theme_slug is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  end if;

  if exists (
    select 1 from public.wallet_ledger where request_id = p_request_id and user_id = p_user_id
  ) then
    select coin_balance, free_spin_balance, bonus_meter_progress into v_wallet
    from public.wallets where user_id = p_user_id;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'coin_balance', v_wallet.coin_balance,
      'free_spin_balance', v_wallet.free_spin_balance,
      'bonus_meter_progress', coalesce(v_wallet.bonus_meter_progress, 0),
      'theme_slug', p_theme_slug,
      'owned', exists(select 1 from public.user_themes where user_id = p_user_id and theme_slug = p_theme_slug)
    );
  end if;

  select * into v_theme from public.themes where slug = p_theme_slug and is_active = true;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_theme');
  end if;

  if exists (select 1 from public.user_themes where user_id = p_user_id and theme_slug = p_theme_slug) then
    return jsonb_build_object('ok', false, 'error', 'already_owned');
  end if;

  v_price := v_theme.price_coins;

  select * into v_wallet from public.wallets where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  end if;

  if v_wallet.coin_balance < v_price then
    return jsonb_build_object('ok', false, 'error', 'insufficient_coins');
  end if;

  v_new_bal := v_wallet.coin_balance - v_price;

  update public.wallets set coin_balance = v_new_bal, updated_at = now() where id = v_wallet.id;

  if v_price > 0 then
    insert into public.wallet_ledger (
      user_id, wallet_id, transaction_type, currency_type, amount, balance_after,
      reference_type, request_id, metadata
    ) values (
      p_user_id, v_wallet.id, 'theme_purchase', 'coins', -v_price, v_new_bal,
      'theme', p_request_id, jsonb_build_object('theme_slug', p_theme_slug)
    );
  end if;

  insert into public.user_themes (user_id, theme_slug) values (p_user_id, p_theme_slug);

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'coin_balance', v_new_bal,
    'free_spin_balance', v_wallet.free_spin_balance,
    'bonus_meter_progress', coalesce(v_wallet.bonus_meter_progress, 0),
    'theme_slug', p_theme_slug
  );
end;
$$;

revoke all on function public.economy_buy_theme_internal(uuid, uuid, text) from public;
grant execute on function public.economy_buy_theme_internal(uuid, uuid, text) to service_role;

comment on table public.user_themes is 'Owned themes; cosmetic vanity remains client-local until extended RPCs land.';

insert into public.user_themes (user_id, theme_slug)
select p.id, 'vegas' from public.profiles p
where not exists (
  select 1 from public.user_themes ut where ut.user_id = p.id and ut.theme_slug = 'vegas'
);
