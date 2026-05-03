-- Add new RevenueCat / store SKUs for mixed reward bundles shown in the mobile shop.
insert into public.products (sku, store, grant_coins, grant_free_spins, is_active, metadata)
values
  ('daily_deal', 'both', 20000, 10, true, '{"kind":"bundle","label":"Daily Deal"}'::jsonb),
  ('lucky_spin_bundle', 'both', 0, 50, true, '{"kind":"bundle","label":"Lucky Spin Bundle"}'::jsonb)
on conflict (sku) do update set
  grant_coins = excluded.grant_coins,
  grant_free_spins = excluded.grant_free_spins,
  is_active = excluded.is_active,
  metadata = excluded.metadata;
