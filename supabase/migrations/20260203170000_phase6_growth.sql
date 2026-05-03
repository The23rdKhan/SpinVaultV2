-- Phase 6 — Referrals, devices (push tokens), storage bucket stubs.

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referee_id uuid not null unique references public.profiles (id) on delete cascade,
  code text,
  qualified_at timestamptz,
  reward_granted_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text,
  platform text,
  app_version text,
  last_seen_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

alter table public.referrals enable row level security;
alter table public.devices enable row level security;

drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own on public.referrals for select to authenticated
  using (referrer_id = (select auth.uid()) or referee_id = (select auth.uid()));

drop policy if exists devices_select_own on public.devices;
create policy devices_select_own on public.devices for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.referrals to authenticated;
grant select on public.devices to authenticated;
revoke insert, update, delete on public.referrals from authenticated;
revoke insert, update, delete on public.devices from authenticated;

-- Buckets may fail on some hosts (schema / privileges); do not fail entire migration.
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('theme-assets', 'theme-assets', true)
  on conflict (id) do nothing;
exception
  when undefined_table then
    raise notice 'storage.buckets unavailable — skip theme-assets';
  when insufficient_privilege then
    raise notice 'storage.buckets denied — skip theme-assets';
end $$;

do $$
begin
  insert into storage.buckets (id, name, public)
  values ('profile-assets', 'profile-assets', true)
  on conflict (id) do nothing;
exception
  when undefined_table then
    raise notice 'storage.buckets unavailable — skip profile-assets';
  when insufficient_privilege then
    raise notice 'storage.buckets denied — skip profile-assets';
end $$;
