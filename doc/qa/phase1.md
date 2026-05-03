# Phase 1 manual smoke — server-authoritative spins

## Prerequisites

1. Phase 0 migration applied; users have `wallets` rows.
2. Apply [`supabase/migrations/20260202123000_phase1_spins_spin_commit.sql`](../../supabase/migrations/20260202123000_phase1_spins_spin_commit.sql).
3. Deploy Edge Function **`spin`** (`supabase/functions/spin`). Dashboard → Edge Functions → ensure secrets include `SUPABASE_SERVICE_ROLE_KEY` (usually injected automatically when linked).
4. Mobile `.env`: `EXPO_PUBLIC_USE_SERVER_SPIN=1` plus existing Supabase URL + anon/publishable key.

## Deploy function

From repo root (with Supabase CLI logged in and project linked):

```bash
supabase functions deploy spin
```

Ensure the function allows authenticated callers (default JWT verification is fine; the function also validates the session with `auth.getUser`).

## Checks

1. **Spin**: With server spin on, play a spin → coins/free spins/bonus meter match `wallets` row after animation completes.
2. **`spins` table**: New row per spin with `grid`, `result_summary`, balances after.
3. **`wallet_ledger`**: Entries for paid bet (`spin_bet`), wins (`spin_win`), bonus meter payout (`bonus_meter_full`) when applicable.
4. **Idempotency**: Replaying the same `client_request_id` should not double-charge (Edge always generates a new UUID — manual SQL test optional).
5. **Fallback**: With `EXPO_PUBLIC_USE_SERVER_SPIN` unset or request failure, app uses local RNG spin (coins may diverge from DB until wallet is reconciled).

## Engine parity

Outcome math lives in [`supabase/functions/_shared/slot-engine.ts`](../../supabase/functions/_shared/slot-engine.ts) and must stay aligned with [`mobile/lib/game-context.tsx`](../../mobile/lib/game-context.tsx) paylines/RNG weights.
