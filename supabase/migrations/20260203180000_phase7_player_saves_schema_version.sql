-- Phase 7 — Bump default schema_version for new installs (client migrates payload when increased).

alter table public.player_saves
  alter column schema_version set default 2;

comment on column public.player_saves.schema_version is 'Bump when payload shape changes; default 2 after server-economy cutover docs.';
