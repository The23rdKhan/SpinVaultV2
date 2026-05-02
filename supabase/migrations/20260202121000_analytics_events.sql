/*
  Append-only analytics events (one INSERT per fired event).

  PK/FK
  -----
  - id: surrogate PK (uuid).
  - user_id: FK → public.profiles(id) ON DELETE SET NULL (retain anonymous-ish rows if profile removed).
  - No per-screen tables: all screens POST rows here with event_name + properties jsonb.

  N+1
  ---
  - Clients only INSERT one row per event (no fan-out reads for analytics).
  - Dashboards aggregate with SQL (GROUP BY event_name, date_trunc) — single queries.

  Pre-auth events
  ---------------
  - RLS requires authenticated session and user_id = auth.uid().
  - Until you enable Supabase Anonymous Sign-In (or similar), pre-login events are skipped client-side.
*/

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  session_id text not null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  platform text,
  created_at timestamptz not null default now(),
  constraint analytics_events_payload_object check (jsonb_typeof(properties) = 'object')
);

comment on table public.analytics_events is 'Append-only product analytics; aggregate in warehouse/queries, not per-event joins from app UI.';

create index analytics_events_user_time_idx
  on public.analytics_events (user_id, created_at desc);

create index analytics_events_name_time_idx
  on public.analytics_events (event_name, created_at desc);

alter table public.analytics_events enable row level security;

-- Authenticated users insert only for themselves (matches profiles PK).
create policy analytics_events_insert_own
  on public.analytics_events for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Optional: users read only their own rows (debug/export); revoke if unused.
create policy analytics_events_select_own
  on public.analytics_events for select
  to authenticated
  using (user_id = (select auth.uid()));

grant insert, select on table public.analytics_events to authenticated;
