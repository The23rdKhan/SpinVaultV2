/*
  SpinVault2 — initial cloud save schema (best-practice oriented)

  N+1 avoidance (read path)
  ---------------------------
  - Core progress lives in ONE row: public.player_saves per user.
  - Load profile + save in a SINGLE PostgREST request using an embedded resource
    (no loop of queries per field or per mission).

  Example (supabase-js), one round trip:
    const { data, error } = await supabase
      .from('player_saves')
      .select(`
        user_id,
        schema_version,
        payload,
        updated_at,
        profiles!inner ( id, username, created_at, updated_at )
      `)
      .eq('user_id', user.id)
      .single()

  Write path
  ----------
  - Upsert only player_saves (and optionally patch profiles.username) — fixed small
    number of statements, never “one update per mission row” from the client.

  If you normalize later (inventory rows, spin ledger)
  ----------------------------------------------------
  - Never fetch catalog per item in a loop. Prefer:
      .in('id', ownedIds)   -- one query for many IDs
    or keep owned IDs inside payload jsonb and ship catalog from the app bundle.
  - For leaderboard pages, use one query with range/limit + embedded profile, or
    a single SQL view / RPC that returns exactly the columns the UI needs.

  Security
  --------
  - RLS enabled; policies restrict rows to auth.uid().
  - payload is still client-writable until you add server-side validation (Edge
    Functions) for economy integrity.
*/

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null default 'Player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Display identity; keep narrow to avoid extra joins. Load embedded from player_saves select.';

-- ---------------------------------------------------------------------------
-- Player save blob (1:1, primary artifact for game hydration)
-- ---------------------------------------------------------------------------
create table public.player_saves (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  schema_version integer not null default 1,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint player_saves_payload_is_object check (jsonb_typeof(payload) = 'object')
);

comment on table public.player_saves is 'Single JSON document per user — primary guard against read N+1.';
comment on column public.player_saves.schema_version is 'Bump when payload shape changes; app migrates client-side.';
comment on column public.player_saves.payload is 'Serializable game state subset (no ephemeral spin UI flags).';

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger player_saves_set_updated_at
  before update on public.player_saves
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.player_saves enable row level security;

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Primary insert path is handle_new_user. This policy allows a one-row self-heal if needed.
create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy player_saves_select_own
  on public.player_saves for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy player_saves_insert_own
  on public.player_saves for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy player_saves_update_own
  on public.player_saves for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- New auth user: profile + empty save (avoids signup race + extra client writes)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  return new;
end;
$$;

comment on function public.handle_new_user is 'Creates profile + save row in one server-side transaction after signup.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Grants (explicit; aligns with Data API / PostgREST)
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.player_saves to authenticated;
