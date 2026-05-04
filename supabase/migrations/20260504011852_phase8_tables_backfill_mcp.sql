/*
  Backfill Phase 8 tables that were missing after migration history repair marked
  20260204100000 applied without running SQL. Applied via Supabase MCP; kept in
  repo so local migrations match remote supabase_migrations.
*/

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  daily_reward_reminders boolean not null default false,
  gift_reminders boolean not null default false,
  event_reminders boolean not null default false,
  shop_offer_reminders boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own
  on public.notification_preferences for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own
  on public.notification_preferences for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own
  on public.notification_preferences for insert
  to authenticated
  with check (user_id = (select auth.uid()));

grant select, insert, update on table public.notification_preferences to authenticated;

insert into public.notification_preferences (user_id)
select p.id
from public.profiles p
where not exists (
  select 1 from public.notification_preferences np where np.user_id = p.id
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  rating integer check (rating is null or (rating >= 1 and rating <= 5)),
  category text not null check (category in (
    'gameplay', 'rewards', 'shop', 'ads', 'bug', 'themes', 'profile', 'onboarding', 'other'
  )),
  message text not null,
  screen text,
  app_version text,
  device_model text,
  os_version text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'planned', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_user_created_idx
  on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own
  on public.feedback for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own
  on public.feedback for select
  to authenticated
  using (user_id = (select auth.uid()));

grant insert, select on table public.feedback to authenticated;

comment on table public.feedback is 'Product feedback; user_id nullable on profile delete (RLS limits selects to own rows).';

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  message text not null,
  category text not null check (category in ('purchase', 'bug', 'account', 'gameplay', 'other')),
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_created_idx
  on public.support_tickets (user_id, created_at desc);

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own
  on public.support_tickets for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists support_tickets_select_own on public.support_tickets;
create policy support_tickets_select_own
  on public.support_tickets for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists support_tickets_update_own on public.support_tickets;
create policy support_tickets_update_own
  on public.support_tickets for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant insert, select, update on table public.support_tickets to authenticated;

create table if not exists public.feed_reactions (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.winner_feed (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null check (reaction in ('fire', 'crown', 'coins', 'party')),
  created_at timestamptz not null default now(),
  unique (feed_id, user_id)
);

create index if not exists feed_reactions_feed_idx on public.feed_reactions (feed_id);

alter table public.feed_reactions enable row level security;

drop policy if exists feed_reactions_select_authenticated on public.feed_reactions;
create policy feed_reactions_select_authenticated
  on public.feed_reactions for select
  to authenticated
  using (true);

drop policy if exists feed_reactions_insert_own on public.feed_reactions;
create policy feed_reactions_insert_own
  on public.feed_reactions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists feed_reactions_delete_own on public.feed_reactions;
create policy feed_reactions_delete_own
  on public.feed_reactions for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on table public.feed_reactions to authenticated;

comment on table public.feed_reactions is 'One reaction per user per winner_feed row; replace by delete + insert from client if needed.';
