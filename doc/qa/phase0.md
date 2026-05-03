# Phase 0 manual smoke

## Prerequisites

1. Supabase project: **Authentication → Providers → Anonymous users** enabled.
2. Apply migrations (includes `20260202121500_phase0_wallets_settings_handle_new_user.sql`).

## Checks

1. **Anonymous guest**: Fresh install → Continue as guest → user id is a UUID (not `guest_*`), session persists after restart.
2. **Row seed**: In SQL editor or Table Editor, for that user id verify rows exist: `profiles`, `player_saves`, `wallets` (5000 coins, 3 free spins), two `wallet_ledger` `starter_bonus` rows, `user_settings`, `responsible_play_settings`, `daily_reward_state`, `user_equipped`.
3. **RLS**: As that user via client, `select` on `wallets` and `wallet_ledger` succeeds; direct `update` on `wallets` fails (no policy).
4. **No Supabase env** (dev only): Guest flow still creates local `guest_*` user and logs dev warning.

## Legacy users

Accounts created before this migration do not automatically get `wallets` rows; run a one-off backfill if needed.
