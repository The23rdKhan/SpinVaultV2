# Phase 3 — RevenueCat & real-money IAP (coin packs first)

**Depends on:** [Phase 2](./phase2-server-economy.md) **`economy_*_internal`** + **`wallet_ledger`** idempotency (fulfillment RPC mirrors daily login discipline — unique key per purchase event).

**Expo:** **Dev client / EAS** only — not Expo Go (`react-native-purchases`).

**Backlog mapping:** E1 tickets **SV-101–SV-104** in [`doc/sprint-plan-backlog.md`](../sprint-plan-backlog.md).

---

## Already in repo (not Phase 3 complete)

- [x] **`Purchases.configure`** wired from env keys (`mobile/lib/revenuecat.ts`) — login / restore / webhook fulfillment still TODO below.

---

## Prerequisites

- [ ] Phase 2 **fulfillment-shaped** RPC exists or is added alongside **`economy_fulfill_iap_internal`** (credit coins + ledger row + idempotent key).
- [ ] App Store Connect + Play Console apps and **bank / tax** setup as required by stores.

---

## Checklist

| Task | Notes |
|------|--------|
| [ ] **Store products** | Coin packs in App Store Connect + Play Console; identical product IDs in RevenueCat offerings. |
| [ ] **`Purchases.logIn(user.id)`** | After Supabase session; `logOut` on sign-out — define **guest / anonymous** policy (often “sign in to purchase”). |
| [ ] **Webhook → Edge** | Verify RevenueCat payload/signature; map product id → coin amount; internal RPC with **unique transaction / RC event id** → `wallet_ledger.request_id`. |
| [ ] **Replace auth stub** | **`restorePurchases`**: `Purchases.restorePurchases()` + wallet refresh (`SV-103`). |
| [ ] **Shop UI** | `purchasePackage`; no authoritative **`addCoins`** on client success — **`resyncWalletFromServer()`** after webhook path credits (`SV-102`). |
| [ ] **Sandbox QA** | StoreKit / Play test accounts; ledger row + duplicate webhook replay does not double-credit. |
| [ ] **SV-104** | Release build: no simulated IAP strings / fake grants without `__DEV__`. |

---

## Definition of Done

- Production coin packs only increase balance via **`wallet_ledger`** after verified fulfillment.
- Restore returns accurate entitlements / wallet after resync.

---

## References

- RC init stub: `mobile/lib/revenuecat.ts`
- Env: `mobile/.env.example` (`EXPO_PUBLIC_REVENUECAT_*`)
- Index: [`README.md`](./README.md)
