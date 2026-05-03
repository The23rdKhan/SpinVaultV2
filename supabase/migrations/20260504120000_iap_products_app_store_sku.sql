-- Align public.products.sku with App Store / RevenueCat product IDs (com.spinvault.*).
-- Deactivates legacy short SKUs so fulfillment matches RC webhook product_id.

insert into public.products (sku, store, grant_coins, grant_free_spins, is_active, metadata)
values
  ('com.spinvault.coins.quick_refill', 'both', 2500, 0, true, '{"kind":"coin_pack","label":"Quick Refill"}'::jsonb),
  ('com.spinvault.deal.daily', 'both', 20000, 10, true, '{"kind":"bundle","label":"Daily Deal"}'::jsonb),
  ('com.spinvault.coins.basic', 'both', 15000, 5, true, '{"kind":"coin_pack","label":"Good Deal"}'::jsonb),
  ('com.spinvault.spins.lucky_bundle', 'both', 0, 50, true, '{"kind":"bundle","label":"Lucky Spin Bundle"}'::jsonb),
  ('com.spinvault.coins.popular', 'both', 40000, 15, true, '{"kind":"coin_pack","label":"Most Popular"}'::jsonb),
  ('com.spinvault.coins.premium', 'both', 125000, 40, true, '{"kind":"coin_pack","label":"Best Value"}'::jsonb),
  ('com.spinvault.coins.ultimate', 'both', 350000, 100, true, '{"kind":"coin_pack","label":"High Roller"}'::jsonb),
  ('com.spinvault.coins.mega_vault', 'both', 1000000, 250, true, '{"kind":"coin_pack","label":"VIP Choice"}'::jsonb),
  ('com.spinvault.bundle.starter', 'both', 25000, 25, true, '{"kind":"starter_pack","grant_frame_id":"frame-gold"}'::jsonb)
on conflict (sku) do update set
  grant_coins = excluded.grant_coins,
  grant_free_spins = excluded.grant_free_spins,
  is_active = excluded.is_active,
  metadata = excluded.metadata;

update public.products
set is_active = false
where sku in (
  'quick_refill',
  'starter_bundle',
  'basic',
  'popular',
  'premium',
  'ultimate',
  'mega_vault',
  'daily_deal',
  'lucky_spin_bundle',
  'starter'
);
