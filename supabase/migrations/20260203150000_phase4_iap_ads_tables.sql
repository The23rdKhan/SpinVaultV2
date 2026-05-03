-- Phase 4 — IAP / ads persistence (fulfillment wiring lands in Edge functions + RevenueCat).

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  store text not null check (store in ('apple', 'google', 'both')),
  grant_coins bigint not null default 0 check (grant_coins >= 0),
  grant_free_spins integer not null default 0 check (grant_free_spins >= 0),
  is_active boolean not null default true,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed', 'refunded')),
  revenuecat_customer_id text,
  store_transaction_id text unique,
  granted_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rewarded_ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  network text not null default 'admob',
  placement text,
  request_id uuid not null unique,
  granted_coins bigint not null default 0 check (granted_coins >= 0),
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.rewarded_ads enable row level security;

create policy products_select_active on public.products for select to authenticated using (is_active = true);
create policy purchases_select_own on public.purchases for select to authenticated using (user_id = (select auth.uid()));
create policy rewarded_ads_select_own on public.rewarded_ads for select to authenticated using (user_id = (select auth.uid()));

grant select on public.products to authenticated;
grant select on public.purchases to authenticated;
grant select on public.rewarded_ads to authenticated;
revoke insert, update, delete on public.products from authenticated;
revoke insert, update, delete on public.purchases from authenticated;
revoke insert, update, delete on public.rewarded_ads from authenticated;

comment on table public.purchases is 'Store receipts / RC events; credits via service RPC only.';
comment on table public.rewarded_ads is 'SSV-granted rewards; request_id idempotent.';
