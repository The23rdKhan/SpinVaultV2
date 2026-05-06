-- Compatibility helper: true when the user holds any role in `_allowed_roles`.
-- Mirrors TypeScript requirePermission(); RLS continues to use is_active_admin / has_role.

create or replace function admin.has_permission(
  _uid uuid,
  _allowed_roles admin.admin_role[]
)
returns boolean
language sql
stable
security definer
set search_path = admin
as $$
  select exists (
    select 1
    from admin.admin_roles ar
    where ar.user_id = _uid
      and ar.role = any(_allowed_roles)
  );
$$;

grant execute on function admin.has_permission(uuid, admin.admin_role[]) to authenticated, service_role;

comment on function admin.has_permission(uuid, admin.admin_role[]) is
  'MVP optional SQL helper; primary authorization is TypeScript requirePermission() plus RLS policies.';
