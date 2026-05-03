/*
  Phase 0 — Server-authoritative economy foundation + new-user seed.

  Dashboard (manual): Authentication → enable Anonymous Sign-In so mobile can call signInAnonymously().

  Existing auth.users rows created before this migration do not get wallets automatically; backfill separately if needed.
*/

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Legacy bridge: older projects may have public.users + public.wallets(balance).
-- SpinVault uses public.profiles + wallets(coin_balance, free_spin_balance).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  ) then
    insert into public.profiles (id, username)
    select u.id, coalesce(nullif(trim(u.username), ''), 'Player')
    from public.users u
    where not exists (select 1 from public.profiles p where p.id = u.id)
    on conflict (id) do nothing;

    insert into public.player_saves (user_id, payload)
    select u.id, '{}'::jsonb
    from public.users u
    where not exists (select 1 from public.player_saves s where s.user_id = u.id)
    on conflict (user_id) do nothing;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'wallets'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'wallets' and column_name = 'balance'
    ) then
      alter table public.wallets rename column balance to coin_balance;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'wallets' and column_name = 'free_spin_balance'
    ) then
      alter table public.wallets
        add column free_spin_balance integer not null default 0 check (free_spin_balance >= 0);
    end if;

    alter table public.wallets drop column if exists lifetime_winnings;
    alter table public.wallets drop column if exists lifetime_wagered;

    alter table public.wallets drop constraint if exists wallets_user_id_fkey;

    alter table public.wallets
      add constraint wallets_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Wallets & ledger (client read-only via RLS; writes via SECURITY DEFINER RPCs later)
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  coin_balance bigint not null default 0 check (coin_balance >= 0),
  free_spin_balance integer not null default 0 check (free_spin_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  transaction_type text not null,
  currency_type text not null check (currency_type in ('coins', 'free_spins')),
  amount bigint not null,
  balance_after bigint not null check (balance_after >= 0),
  reference_type text,
  reference_id uuid,
  request_id uuid unique,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wallet_ledger_user_created_idx
  on public.wallet_ledger (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Settings & placeholders for later phases (daily rewards, equipped vanity)
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  sound_enabled boolean not null default true,
  music_enabled boolean not null default true,
  haptics_enabled boolean not null default true,
  notifications_enabled boolean not null default false,
  appearance text not null default 'system',
  reduced_motion_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint user_settings_appearance_valid check (appearance in ('system', 'light', 'dark'))
);

create table if not exists public.responsible_play_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  session_reminder_enabled boolean not null default false,
  session_reminder_minutes integer check (session_reminder_minutes is null or session_reminder_minutes > 0),
  purchase_reminder_enabled boolean not null default false,
  daily_purchase_limit integer check (daily_purchase_limit is null or daily_purchase_limit >= 0),
  cooldown_until timestamptz,
  self_excluded_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_reward_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  current_day integer not null default 1 check (current_day >= 1),
  last_claimed_at timestamptz,
  weekly_progress integer not null default 0 check (weekly_progress >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_equipped (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);

drop trigger if exists wallets_set_updated_at on public.wallets;
create trigger wallets_set_updated_at
  before update on public.wallets
  for each row
  execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_updated_at();

drop trigger if exists responsible_play_settings_set_updated_at on public.responsible_play_settings;
create trigger responsible_play_settings_set_updated_at
  before update on public.responsible_play_settings
  for each row
  execute function public.set_updated_at();

drop trigger if exists daily_reward_state_set_updated_at on public.daily_reward_state;
create trigger daily_reward_state_set_updated_at
  before update on public.daily_reward_state
  for each row
  execute function public.set_updated_at();

drop trigger if exists user_equipped_set_updated_at on public.user_equipped;
create trigger user_equipped_set_updated_at
  before update on public.user_equipped
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.user_settings enable row level security;
alter table public.responsible_play_settings enable row level security;
alter table public.daily_reward_state enable row level security;
alter table public.user_equipped enable row level security;

drop policy if exists wallets_select_own on public.wallets;
create policy wallets_select_own
  on public.wallets for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists wallet_ledger_select_own on public.wallet_ledger;
create policy wallet_ledger_select_own
  on public.wallet_ledger for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own
  on public.user_settings for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own
  on public.user_settings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists responsible_play_select_own on public.responsible_play_settings;
create policy responsible_play_select_own
  on public.responsible_play_settings for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists responsible_play_update_own on public.responsible_play_settings;
create policy responsible_play_update_own
  on public.responsible_play_settings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists daily_reward_state_select_own on public.daily_reward_state;
create policy daily_reward_state_select_own
  on public.daily_reward_state for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_equipped_select_own on public.user_equipped;
create policy user_equipped_select_own
  on public.user_equipped for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on table public.wallets to authenticated;
grant select on table public.wallet_ledger to authenticated;
grant select, update on table public.user_settings to authenticated;
grant select, update on table public.responsible_play_settings to authenticated;
grant select on table public.daily_reward_state to authenticated;
grant select on table public.user_equipped to authenticated;

-- ---------------------------------------------------------------------------
-- New auth user: profile, save, wallet + starter ledger, settings rows
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
  v_starter_coins bigint := 5000;
  v_starter_spins integer := 3;
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      'Player'
    )
  )
  on conflict (id) do nothing;

  insert into public.player_saves (user_id, payload)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  insert into public.wallets (user_id, coin_balance, free_spin_balance)
  values (new.id, v_starter_coins, v_starter_spins)
  returning id into v_wallet_id;

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_type,
    currency_type,
    amount,
    balance_after,
    reference_type,
    metadata
  )
  values (
    new.id,
    v_wallet_id,
    'starter_bonus',
    'coins',
    v_starter_coins,
    v_starter_coins,
    'signup',
    jsonb_build_object('source', 'handle_new_user')
  );

  insert into public.wallet_ledger (
    user_id,
    wallet_id,
    transaction_type,
    currency_type,
    amount,
    balance_after,
    reference_type,
    metadata
  )
  values (
    new.id,
    v_wallet_id,
    'starter_bonus',
    'free_spins',
    v_starter_spins,
    v_starter_spins,
    'signup',
    jsonb_build_object('source', 'handle_new_user')
  );

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.responsible_play_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.daily_reward_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_equipped (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user is 'Creates profile, save, wallet + starter ledger, settings/equipped placeholders after signup (including anonymous).';
