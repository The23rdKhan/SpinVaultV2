# Roadmap — post Phase 1 (mobile + Supabase)

**Last updated:** May 2026

Work after **[Phase 0](../qa/phase0.md)** (wallet seed) and **[Phase 1](../qa/phase1.md)** (server spin) is split into **three phases** so you can ship and QA independently. Ticket-style IDs live in **[`doc/sprint-plan-backlog.md`](../sprint-plan-backlog.md)** (E1–E3 align with Phases 3–4 and monetization).

| Phase | Doc | Focus |
|-------|-----|--------|
| **2** | [phase2-server-economy.md](./phase2-server-economy.md) | Move grants/spends off local `addCoins` — wheel, missions, shop spends, themes/vanity RPCs. |
| **3** | [phase3-revenuecat-iap.md](./phase3-revenuecat-iap.md) | RevenueCat + store products → webhook → wallet fulfillment (coin packs first). |
| **4** | [phase4-admob-rewarded.md](./phase4-admob-rewarded.md) | Google AdMob rewarded ads + SSV → Edge grant → wallet (Expo dev client / EAS). |

### Execution order

1. **Phase 2 first** — establishes reusable **`economy_*_internal`** + **`wallet_ledger`** patterns (daily login already shipped as the template).
2. **Phase 3 next** — IAP fulfillment reuses that pattern (`economy_fulfill_iap_internal` or equivalent).
3. **Phase 4 in parallel with 3 is OK** once Phase 2 proves **`economy` Edge** deploys and ledger writes are stable — AdMob SSV needs the same idempotent grant path.

**Rules:** Do **not** recreate `wallets` / `wallet_ledger`; extend with migrations + internal RPCs (`service_role` only) + Edge.

### Current focus (pick one vertical slice)

Start Phase 2 with **one** of these before widening scope:

1. **Daily wheel** — single RPC + `economy` action, mirrors daily login complexity.
2. **Shop: free-spin bundles** — debit coins / credit FS; unblocks consistent wallet before themes.

Then: mission claims → themes/vanity → chest → strip simulated coin packs for release builds.

---

## Already shipped (baseline)

**Infra / QA**

- [x] Phase 0 — wallets, anonymous auth, `handle_new_user` (`doc/qa/phase0.md`).
- [x] Phase 1 — `spin` Edge + `spin_commit_internal`, `EXPO_PUBLIC_USE_SERVER_SPIN` (`doc/qa/phase1.md`).
- [x] Shared JWT for Edge — `supabase/functions/_shared/require-session.ts` used by **`spin`** and **`economy`**.
- [x] **`mobile/.env.example`** documents server spin + server economy + RC placeholders (`doc/mobile-expo.md`).

**Economy (Phase 2 slice)**

- [x] Daily login — `economy_claim_daily_reward_internal`, Edge **`economy`** (`claim_daily_reward`), `EXPO_PUBLIC_USE_SERVER_ECONOMY`, `daily_reward_state` hydrate + auth refresh; client `economy-client.ts` + aligned constants in `shared/economy/daily-login-rewards.ts`.
- [x] Lenient spin fallback — `spinSyncDeferred`, **`SpinSyncBanner`**, throttled toast; **no local fallback** for daily claim when server economy is on.

**Play UX (mobile)**

- [x] Control deck — INFO / LINES / **QUICK** (fast win tally); low-balance prompts link to **Shop** and **Rewards** (`routes.shop` / `routes.rewards`).
- [x] RevenueCat **`Purchases.configure`** stub (`mobile/lib/revenuecat.ts`); **`restorePurchases`** still placeholder until Phase 3.

---

## Shared QA & ops

| Task | Notes |
|------|--------|
| [ ] **`supabase db push`** | Apply migrations before enabling new Edge actions. |
| [ ] **`supabase functions deploy`** | `spin`, `economy`, and any new functions after changes. |
| [x] **`mobile/.env.example`** | Spin, economy, RC (Phase 3), AdMob notes — kept in sync with flags. |
| [ ] **Legacy wallet backfill** | Users without `wallets` (`doc/qa/phase0.md`). |
| [ ] **`doc/qa/`** | Add smoke docs per shipped slice (`phase2-wheel.md`, IAP sandbox, SSV, etc.). |

---

## Product stance

- **Primary IAP:** coin packs (Phase 3); cosmetics remain **coin sinks** (Phase 2 server spends).
- **Daily login / earned free spins:** free; server-backed where fraud matters; optional IAP spin packs later (Phase 3 webhook pattern).
- **Rewarded ads:** Phase 4 only; **no** trusted production coin grant until SSV + RPC land.

## References

- Runbook: [`doc/mobile-expo.md`](../mobile-expo.md)
- QA: [`doc/qa/phase0.md`](../qa/phase0.md), [`doc/qa/phase1.md`](../qa/phase1.md)
- Backlog tickets: [`doc/sprint-plan-backlog.md`](../sprint-plan-backlog.md)
