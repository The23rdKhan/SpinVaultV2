-- IAP product catalog v2: coin packs + free spins; aligned with mobile shop + RevenueCat SKUs.
-- Retire legacy `starter` (1,000 coins) in favor of `quick_refill` (2,500).

insert into public.products (sku, store, grant_coins, grant_free_spins, is_active, metadata)
values
  ('quick_refill', 'both', 2500, 0, true, '{"kind":"coin_pack","label":"Quick Refill"}'::jsonb),
  ('starter_bundle', 'both', 25000, 25, true, '{"kind":"starter_pack","grant_frame_id":"frame-gold"}'::jsonb),
  ('basic', 'both', 15000, 5, true, '{"kind":"coin_pack","label":"Good Deal"}'::jsonb),
  ('popular', 'both', 40000, 15, true, '{"kind":"coin_pack","label":"Most Popular"}'::jsonb),
  ('premium', 'both', 125000, 40, true, '{"kind":"coin_pack","label":"Best Value"}'::jsonb),
  ('ultimate', 'both', 350000, 100, true, '{"kind":"coin_pack","label":"High Roller"}'::jsonb),
  ('mega_vault', 'both', 1000000, 250, true, '{"kind":"coin_pack","label":"VIP Choice"}'::jsonb)
on conflict (sku) do update set
  grant_coins = excluded.grant_coins,
  grant_free_spins = excluded.grant_free_spins,
  is_active = excluded.is_active,
  metadata = excluded.metadata;

update public.products
set is_active = false
where sku = 'starter';
