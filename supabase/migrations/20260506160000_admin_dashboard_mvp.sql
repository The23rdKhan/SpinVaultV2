-- SpinVault Admin Dashboard — MVP schema (§M)
-- After applying: add schema "admin" to Supabase Dashboard → Settings → API → Exposed schemas.

create schema if not exists admin;

grant usage on schema admin to postgres, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type admin.admin_role as enum (
    'super_admin',
    'content_manager',
    'qa_reviewer',
    'legal_compliance',
    'economy_manager',
    'artist_designer'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type admin.content_category as enum (
    'theme',
    'collectible',
    'avatar',
    'frame',
    'badge',
    'title',
    'pet',
    'cabinet',
    'room',
    'car',
    'chest_drop',
    'seasonal_bundle'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type admin.rarity as enum (
    'common',
    'rare',
    'epic',
    'legendary',
    'mythic'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type admin.review_gate_status as enum (
    'not_started',
    'in_review',
    'approved',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type admin.publish_status as enum (
    'draft',
    'generating_assets',
    'ready_for_review',
    'qa_review',
    'legal_review',
    'approved',
    'scheduled',
    'published',
    'archived',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type admin.equip_slot as enum (
    'avatar',
    'frame',
    'badge',
    'title',
    'pet',
    'cabinet_skin',
    'room_bg',
    'car',
    'none'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type admin.job_status as enum (
    'queued',
    'running',
    'succeeded',
    'failed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type admin.job_kind as enum (
    'image',
    'sound'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Theme token validation ([SCR-4])
-- ---------------------------------------------------------------------------

create or replace function admin.validate_theme_tokens(tokens jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  k text;
  expected constant text[] := array[
    'cabinetBg','cabinetBorder','reelBg','reelBorder',
    'spinButtonStart','spinButtonEnd','jackpot','win','machineAccent'
  ];
begin
  if tokens is null or tokens = '{}'::jsonb then
    return true;
  end if;
  if (select count(*) from jsonb_object_keys(tokens)) <> 9 then
    return false;
  end if;
  for k in select * from jsonb_object_keys(tokens)
  loop
    if not k = any(expected) then
      return false;
    end if;
  end loop;
  if exists (
    select 1
    from jsonb_each_text(tokens) as e(key, val)
    where val !~ '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$'
  ) then
    return false;
  end if;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bootstrap (first super_admin via /setup)
-- ---------------------------------------------------------------------------

create table if not exists admin.bootstrap_state (
  id int primary key check (id = 1),
  completed_at timestamptz,
  completed_by uuid
);

insert into admin.bootstrap_state (id)
values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table if not exists admin.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists admin.admin_roles (
  user_id uuid not null references admin.admin_users (id) on delete cascade,
  role admin.admin_role not null,
  granted_by uuid references admin.admin_users (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index if not exists admin_roles_user_idx on admin.admin_roles (user_id);

-- ---------------------------------------------------------------------------
-- Helpers for RLS (SECURITY DEFINER — after identity tables exist)
-- ---------------------------------------------------------------------------

create or replace function admin.is_active_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = admin
as $$
  select exists (
    select 1
    from admin.admin_users au
    where au.id = uid
      and au.is_active = true
      and exists (
        select 1 from admin.admin_roles ar where ar.user_id = au.id
      )
  );
$$;

create or replace function admin.has_role(uid uuid, r admin.admin_role)
returns boolean
language sql
stable
security definer
set search_path = admin
as $$
  select exists (
    select 1 from admin.admin_roles where user_id = uid and role = r
  );
$$;

-- ---------------------------------------------------------------------------
-- Catalog versioning
-- ---------------------------------------------------------------------------

create table if not exists admin.catalog_meta (
  id int primary key check (id = 1),
  last_version bigint not null default 0
);

insert into admin.catalog_meta (id)
values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Content envelope + extensions
-- ---------------------------------------------------------------------------

create table if not exists admin.content_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category admin.content_category not null,
  display_name text not null,
  description text,
  store_copy jsonb not null default '{}'::jsonb,
  rarity admin.rarity not null default 'common',
  price_coins bigint,
  iap_sku text,
  is_iap_only boolean not null default false,
  is_limited boolean not null default false,
  start_at timestamptz,
  end_at timestamptz,
  unlock_requirements jsonb not null default '{}'::jsonb,
  ownership_rules jsonb not null default '{}'::jsonb,
  equip_rules jsonb not null default '{}'::jsonb,
  preview_image_url text,
  thumbnail_url text,
  full_image_url text,
  video_preview_url text,
  theme_token_data jsonb,
  legal_status admin.review_gate_status not null default 'not_started',
  qa_status admin.review_gate_status not null default 'not_started',
  publish_status admin.publish_status not null default 'draft',
  current_version_id uuid,
  created_by uuid references admin.admin_users (id),
  approved_by jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_items_limited_window_ok check (
    is_limited = false
    or (start_at is not null and end_at is not null and end_at > start_at + interval '1 hour')
  )
);

create index if not exists content_items_cat_status_idx
  on admin.content_items (category, publish_status);

create index if not exists content_items_limited_idx
  on admin.content_items (start_at, end_at)
  where is_limited = true;

create index if not exists content_items_store_copy_gin
  on admin.content_items using gin (store_copy jsonb_path_ops);

create index if not exists content_items_unlock_gin
  on admin.content_items using gin (unlock_requirements jsonb_path_ops);

create table if not exists admin.theme_items (
  content_item_id uuid primary key references admin.content_items (id) on delete cascade,
  theme_slug text not null,
  tokens_dark jsonb not null default '{}'::jsonb,
  tokens_light jsonb not null default '{}'::jsonb,
  symbol_set_id uuid,
  audio_set_id uuid,
  animation_set_id uuid,
  cabinet_dark_url text,
  cabinet_light_url text,
  reel_dark_url text,
  reel_light_url text,
  contrast_checks jsonb,
  constraint theme_tokens_dark_ok check (admin.validate_theme_tokens(tokens_dark)),
  constraint theme_tokens_light_ok check (admin.validate_theme_tokens(tokens_light))
);

create index if not exists theme_items_slug_idx on admin.theme_items (theme_slug);

create table if not exists admin.collectible_items (
  content_item_id uuid primary key references admin.content_items (id) on delete cascade,
  equip_slot admin.equip_slot not null default 'none',
  animation_asset_id uuid,
  audio_cue_id uuid,
  lottie_or_rive_url text,
  seasonal_event_id uuid
);

-- ---------------------------------------------------------------------------
-- AI jobs + assets
-- ---------------------------------------------------------------------------

create table if not exists admin.asset_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references admin.content_items (id) on delete set null,
  kind admin.job_kind not null default 'image',
  asset_type text not null,
  provider text not null,
  model text not null,
  prompt text not null,
  negative_prompt text,
  reference_image_urls text[],
  aspect_ratio text not null,
  transparent_background boolean,
  count int not null check (count between 1 and 4),
  seed int,
  revised_prompt text,
  cost_estimate_usd numeric(12, 4),
  status admin.job_status not null default 'queued',
  error text,
  created_by uuid references admin.admin_users (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists asset_generation_jobs_status_created_idx
  on admin.asset_generation_jobs (status, created_at desc);

create table if not exists admin.generated_assets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references admin.asset_generation_jobs (id) on delete cascade,
  candidate_index int not null,
  storage_path text not null,
  public_url text not null,
  width int,
  height int,
  safety_status text,
  provider_meta jsonb,
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  unique (job_id, candidate_index)
);

create index if not exists generated_assets_job_sel_idx
  on admin.generated_assets (job_id, selected);

-- ---------------------------------------------------------------------------
-- Reviews, publish, catalog, audit
-- ---------------------------------------------------------------------------

create table if not exists admin.content_reviews (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references admin.content_items (id) on delete cascade,
  gate text not null check (gate in ('qa', 'legal')),
  status text not null check (status in ('approved', 'rejected')),
  reviewer_id uuid references admin.admin_users (id),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists content_reviews_item_idx
  on admin.content_reviews (content_item_id, created_at desc);

create table if not exists admin.publish_versions (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references admin.content_items (id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  catalog_version bigint not null,
  published_by uuid references admin.admin_users (id),
  published_at timestamptz not null default now(),
  unique (content_item_id, version)
);

create index if not exists publish_versions_item_ver_idx
  on admin.publish_versions (content_item_id, version desc);

create table if not exists admin.store_catalog (
  catalog_version bigint primary key,
  payload jsonb not null,
  payload_sha256 text not null,
  payload_url text not null default '',
  built_at timestamptz not null default now(),
  built_by uuid references admin.admin_users (id),
  notes text
);

create table if not exists admin.audit_log (
  id bigserial primary key,
  actor_id uuid references admin.admin_users (id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  at timestamptz not null default now()
);

create index if not exists audit_log_actor_idx on admin.audit_log (actor_id, at desc);
create index if not exists audit_log_entity_idx on admin.audit_log (entity_type, entity_id, at desc);

create table if not exists admin.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  rollout_pct int not null default 0 check (rollout_pct between 0 and 100),
  audience_segment jsonb,
  description text,
  updated_by uuid references admin.admin_users (id),
  updated_at timestamptz
);

-- FK from content_items to publish_versions (added after publish_versions exists)
do $$ begin
  alter table admin.content_items
    add constraint content_items_current_version_fk
    foreign key (current_version_id) references admin.publish_versions (id)
    on delete set null;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Grants (RLS still applies)
-- ---------------------------------------------------------------------------

grant usage on schema admin to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema admin to authenticated, service_role;
grant usage, select on all sequences in schema admin to authenticated, service_role;

alter default privileges in schema admin grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema admin grant usage, select on sequences to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table admin.admin_users enable row level security;
alter table admin.admin_roles enable row level security;
alter table admin.bootstrap_state enable row level security;
alter table admin.catalog_meta enable row level security;
alter table admin.content_items enable row level security;
alter table admin.theme_items enable row level security;
alter table admin.collectible_items enable row level security;
alter table admin.asset_generation_jobs enable row level security;
alter table admin.generated_assets enable row level security;
alter table admin.content_reviews enable row level security;
alter table admin.publish_versions enable row level security;
alter table admin.store_catalog enable row level security;
alter table admin.audit_log enable row level security;
alter table admin.feature_flags enable row level security;

-- admin_users
drop policy if exists admin_users_select on admin.admin_users;
create policy admin_users_select on admin.admin_users
  for select to authenticated
  using (
    id = auth.uid()
    or admin.is_active_admin(auth.uid())
  );

drop policy if exists admin_users_insert_self on admin.admin_users;
create policy admin_users_insert_self on admin.admin_users
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists admin_users_update_self on admin.admin_users;
create policy admin_users_update_self on admin.admin_users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- admin_roles (reads for admins; writes restricted to super_admin — bootstrap uses service_role)
drop policy if exists admin_roles_select on admin.admin_roles;
create policy admin_roles_select on admin.admin_roles
  for select to authenticated
  using (admin.is_active_admin(auth.uid()) or user_id = auth.uid());

drop policy if exists admin_roles_write_super on admin.admin_roles;
create policy admin_roles_write_super on admin.admin_roles
  for all to authenticated
  using (admin.has_role(auth.uid(), 'super_admin'))
  with check (admin.has_role(auth.uid(), 'super_admin'));

-- bootstrap + catalog meta: readable by authenticated signed-in users finishing setup
drop policy if exists bootstrap_select on admin.bootstrap_state;
create policy bootstrap_select on admin.bootstrap_state
  for select to authenticated
  using (true);

drop policy if exists catalog_meta_select on admin.catalog_meta;
create policy catalog_meta_select on admin.catalog_meta
  for select to authenticated
  using (admin.is_active_admin(auth.uid()));

drop policy if exists catalog_meta_update on admin.catalog_meta;
create policy catalog_meta_update on admin.catalog_meta
  for update to authenticated
  using (
    admin.has_role(auth.uid(), 'super_admin')
    or admin.has_role(auth.uid(), 'content_manager')
  )
  with check (
    admin.has_role(auth.uid(), 'super_admin')
    or admin.has_role(auth.uid(), 'content_manager')
  );

-- Generic content access: any active admin role (fine-grained checks in Next.js [§C])
drop policy if exists content_items_all on admin.content_items;
create policy content_items_all on admin.content_items
  for all to authenticated
  using (admin.is_active_admin(auth.uid()))
  with check (admin.is_active_admin(auth.uid()));

drop policy if exists theme_items_all on admin.theme_items;
create policy theme_items_all on admin.theme_items
  for all to authenticated
  using (admin.is_active_admin(auth.uid()))
  with check (admin.is_active_admin(auth.uid()));

drop policy if exists collectible_items_all on admin.collectible_items;
create policy collectible_items_all on admin.collectible_items
  for all to authenticated
  using (admin.is_active_admin(auth.uid()))
  with check (admin.is_active_admin(auth.uid()));

drop policy if exists asset_jobs_all on admin.asset_generation_jobs;
create policy asset_jobs_all on admin.asset_generation_jobs
  for all to authenticated
  using (admin.is_active_admin(auth.uid()))
  with check (admin.is_active_admin(auth.uid()));

drop policy if exists generated_assets_all on admin.generated_assets;
create policy generated_assets_all on admin.generated_assets
  for all to authenticated
  using (admin.is_active_admin(auth.uid()))
  with check (admin.is_active_admin(auth.uid()));

drop policy if exists content_reviews_all on admin.content_reviews;
create policy content_reviews_all on admin.content_reviews
  for all to authenticated
  using (admin.is_active_admin(auth.uid()))
  with check (admin.is_active_admin(auth.uid()));

drop policy if exists publish_versions_all on admin.publish_versions;
create policy publish_versions_all on admin.publish_versions
  for all to authenticated
  using (admin.is_active_admin(auth.uid()))
  with check (admin.is_active_admin(auth.uid()));

drop policy if exists store_catalog_select on admin.store_catalog;
create policy store_catalog_select on admin.store_catalog
  for select to authenticated
  using (admin.is_active_admin(auth.uid()));

drop policy if exists store_catalog_insert on admin.store_catalog;
create policy store_catalog_insert on admin.store_catalog
  for insert to authenticated
  with check (
    admin.has_role(auth.uid(), 'super_admin')
    or admin.has_role(auth.uid(), 'content_manager')
  );

drop policy if exists audit_select on admin.audit_log;
create policy audit_select on admin.audit_log
  for select to authenticated
  using (admin.is_active_admin(auth.uid()));

drop policy if exists audit_insert on admin.audit_log;
create policy audit_insert on admin.audit_log
  for insert to authenticated
  with check (
    admin.is_active_admin(auth.uid())
    and actor_id = auth.uid()
  );

drop policy if exists feature_flags_all on admin.feature_flags;
create policy feature_flags_all on admin.feature_flags
  for all to authenticated
  using (admin.has_role(auth.uid(), 'super_admin'))
  with check (admin.has_role(auth.uid(), 'super_admin'));

-- ---------------------------------------------------------------------------
-- Storage buckets (generated vs published)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('generated-assets', 'generated-assets', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('published-assets', 'published-assets', true)
on conflict (id) do nothing;

-- Authenticated SpinVault players share `authenticated` — restrict writes to dashboard admins only.
drop policy if exists generated_assets_bucket_rw on storage.objects;
create policy generated_assets_bucket_rw on storage.objects
  for all to authenticated
  using (
    bucket_id = 'generated-assets'
    and admin.is_active_admin(auth.uid())
  )
  with check (
    bucket_id = 'generated-assets'
    and admin.is_active_admin(auth.uid())
  );

drop policy if exists published_assets_bucket_rw on storage.objects;
create policy published_assets_bucket_rw on storage.objects
  for all to authenticated
  using (
    bucket_id = 'published-assets'
    and admin.is_active_admin(auth.uid())
  )
  with check (
    bucket_id = 'published-assets'
    and admin.is_active_admin(auth.uid())
  );

-- Optional public read for published-assets (mobile / CDN); bucket already public=true
drop policy if exists published_assets_public_read on storage.objects;
create policy published_assets_public_read on storage.objects
  for select to public
  using (bucket_id = 'published-assets');
