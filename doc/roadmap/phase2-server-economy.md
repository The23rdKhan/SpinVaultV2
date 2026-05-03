# Phase 2 — Server economy completion

Move every **coin / free spin** grant or spend that still uses local **`addCoins` / `subtractCoins` / `buyTheme` / …** in `game-context` to **Postgres + Edge `economy`** (same pattern as daily login).

**Depends on:** Phase 0–1 baseline — see [`README.md`](./README.md).

**Blocks:** Clean IAP ([Phase 3](./phase3-revenuecat-iap.md)) and ad grants ([Phase 4](./phase4-admob-rewarded.md)) need trustworthy **`wallet_ledger`** + internal RPCs.

**Out of scope here:** Rewarded video grants → [Phase 4](./phase4-admob-rewarded.md). **`WatchAdCard`** stays mock or feature-flagged until then.

---

## Shipped (Phase 2 — partial)

These are **done** in repo; everything below **Goals** is **remaining**.

| Item | What landed |
|------|-------------|
| **Daily login** | Migration `economy_claim_daily_reward_internal`, Edge **`economy`** action `claim_daily_reward`, `mobile/lib/economy-client.ts`, `game-context` async claim + `daily_reward_state` hydrate, shared amounts in `shared/economy/daily-login-rewards.ts`. Flag: **`EXPO_PUBLIC_USE_SERVER_ECONOMY`**. |
| **Auth for Edge** | `supabase/functions/_shared/require-session.ts` — JWT verification shared by **`spin`** and **`economy`**. |

**Smoke:** Deploy migration + `supabase functions deploy economy`, set `EXPO_PUBLIC_USE_SERVER_ECONOMY=1`, sign in, claim each streak day; expect wallet + `wallet_ledger` rows and no duplicate credit on retry.

---

## Goals

- Each user-visible economy action: **lock wallet → apply delta → insert `wallet_ledger` → idempotent `request_id` where needed**.
- Client: call Edge → merge response or **`resyncWalletFromServer()`**.
- Release builds: no authoritative **`addCoins`** for economy-affecting flows except behind **`__DEV__`** sandboxes.

---

## Checklist — remaining work (suggested order)

| Priority | Task | Notes |
|:--------:|------|--------|
| ✅ | ~~**Daily login**~~ | **Shipped** — see table above. |
| P1 | **Daily wheel** | New `economy` action + internal RPC; one outcome per calendar day (or your rule); idempotent `request_id`. Good next slice after daily login. |
| P1 | **Shop: free-spin bundles** | Debit coins, credit `free_spin_balance`, ledger; aligns spin economy with DB. |
| P1 | **Mission claims** | Server progress table or derive from `spins`; payout RPC + ledger. |
| P2 | **Themes / vanity spends** | RPC: debit + persist owned inventory (`profiles` JSON or dedicated tables). |
| P2 | **Cosmetic chest** | RPC `open_chest_internal` or disable until defined. |
| P1 | **Simulated coin packs** | Gate shop **`addCoins`** to **`__DEV__`** only in release; production waits for [Phase 3](./phase3-revenuecat-iap.md) (SV-104). |
| — | **Dispatcher** | Prefer extending Edge **`economy`** with new `action` values; keep internal RPCs **`service_role` only**. |

---

## Definition of Done (Phase 2 slice)

- Migration + internal RPC + `economy` branch deployed; `supabase functions deploy economy`.
- Mobile calls Edge when `EXPO_PUBLIC_USE_SERVER_ECONOMY=1` (extend same flag or add per-feature flags if needed).
- Row visible in **`wallet_ledger`** for the action; replay same idempotency key does not double-credit.
- `npm run typecheck` in `mobile/` passes.

---

## References

- Template: migration `20260202140000_economy_daily_reward_claim.sql`, Edge `supabase/functions/economy/`.
- Index: [`README.md`](./README.md)
