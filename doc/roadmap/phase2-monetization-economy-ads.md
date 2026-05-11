# Phase 2 — Monetization, economy completion, ads

Checklist to finish this phase for the **Expo mobile** app. Extend Postgres / Edge only—do **not** recreate `wallets` / `wallet_ledger`; add RPCs + ledger rows.

## Already in repo (baseline)

- [x] Phase 0 — wallets, anonymous auth, `handle_new_user` seed (`doc/qa/phase0.md`).
- [x] Phase 1 — server-authoritative **spin** (`spin` Edge + `spin_commit_internal`), mobile flag `EXPO_PUBLIC_USE_SERVER_SPIN` (`doc/qa/phase1.md`).
- [x] Daily login rewards — `economy_claim_daily_reward_internal`, Edge **`economy`** (`claim_daily_reward`), mobile `EXPO_PUBLIC_USE_SERVER_ECONOMY`, hydrate from `daily_reward_state`.
- [x] Lenient spin fallback UX — `spinSyncDeferred`, sync banner, throttled toast.
- [x] RevenueCat SDK init stub — `mobile/lib/revenuecat.ts`; **`restorePurchases`** in auth is still a **placeholder**.

---

## A. Server economy (move off local `addCoins` / `subtractCoins`)

Goal: every grant or spend that affects coins / free spins hits **`wallet_ledger`** with idempotency where needed.

| Task | Notes |
|------|--------|
| [ ] **Daily wheel** | Edge `economy` action + internal RPC; one spin per calendar day (or product rule); idempotent `request_id`. |
| [ ] **Mission claims** | Persist progress server-side or derive from `spins`; payout RPC + ledger. |
| [ ] **Shop: coin packs** | Remove or **`__DEV__`**-only simulated `addCoins`; real IAP only after RevenueCat fulfillment (section B). |
| [ ] **Shop: free-spin bundles** | RPC debits coins / credits `free_spin_balance` + ledger. |
| [ ] **Themes / vanity spends** | RPC: debit + update owned inventory server-side. |
| [ ] **Cosmetic chest** | RPC `open_chest_internal` or disable until defined. |
| [ ] **Optional** | Single `economy` dispatcher vs many Edge routes—keep internal RPCs `service_role` only. |

Client pattern: call Edge → merge balances or `resyncWalletFromServer()`.

---

## B. RevenueCat (real-money IAP, coin packs first)

| Task | Notes |
|------|--------|
| [ ] **Dashboard** | Products in App Store Connect + Play Console; same IDs in RevenueCat; offerings for **coin packs**. |
| [ ] **`Purchases.logIn(user.id)`** | After Supabase session; `logOut` on sign-out (define guest policy). |
| [ ] **Webhook → Edge** | Verify RC signature; map product id → coins; call **`economy_fulfill_iap_internal`** (or similar) with **unique transaction / event id** in `wallet_ledger.request_id`. |
| [ ] **Replace stub `restorePurchases`** | `Purchases.restorePurchases()` + wallet / entitlement refresh. |
| [ ] **Shop UI** | `purchasePackage` flow; no authoritative `addCoins` on success until server credits (then resync). |

Expo: **dev client / EAS** only—not Expo Go.

---

## C. Google AdMob + Expo SDK 55 (rewarded → coins)

| Task | Notes |
|------|--------|
| [ ] **AdMob account** | Apps for iOS/Android; **App IDs** + **rewarded ad unit** IDs. |
| [ ] **Install** | `npx expo install react-native-google-mobile-ads`; confirm compatibility with **RN 0.83 / New Architecture** (library release notes). |
| [ ] **Config plugin** | `app.config` / `app.json`: `react-native-google-mobile-ads` plugin with `androidAppId` / `iosAppId`; optional SKAdNetwork list, ATT string. |
| [ ] **Rebuild native** | `expo prebuild` + `expo run:*` or **EAS Build** after plugin changes. |
| [ ] **Consent / ATT** | UMP (EEA); `expo-tracking-transparency` before personalized ads; `mobileAds().setRequestConfiguration` / `initialize()` order per [Invertase docs](https://docs.page/invertase/react-native-google-mobile-ads). |
| [ ] **Dev test ads** | `TestIds.REWARDED` until production units. |
| [ ] **SSV** | AdMob **Server-Side Verification** URL → Supabase **Edge** verifies signature → **`economy_grant_ad_reward_internal`** (idempotent) → ledger; client only **resyncs** wallet. |
| [ ] **Replace `WatchAdCard`** | Remove client-only `addCoins`; wire rewarded load/show + cooldowns. |
| [ ] **Play policy** | Declare app contains ads; privacy / data safety forms updated. |

---

## D. QA & ops

| Task | Notes |
|------|--------|
| [ ] **`db push` + deploy** | Apply migrations; `supabase functions deploy spin economy` (+ future functions). |
| [ ] **Env templates** | `mobile/.env.example`: document `EXPO_PUBLIC_USE_SERVER_SPIN`, `EXPO_PUBLIC_USE_SERVER_ECONOMY`, RC keys, optional AdMob-related env if any. |
| [ ] **Legacy wallets** | SQL backfill for users missing `wallets` (`doc/qa/phase0.md`). |
| [ ] **Smoke scripts** | Extend `doc/qa/` with Phase 2 checklist (IAP sandbox, rewarded + SSV, wheel/missions when shipped). |

---

## Product stance (agreed direction)

- **Primary IAP:** coin packs (soft currency); themes/vanity remain **coin sinks** unless you add rare IAP bundles later.
- **Daily login / earned free spins:** stay **free**, server-side where fraud matters; optional IAP **spin packs** later via same webhook pattern as coins.

---

## References

- Expo + AdMob module: [react-native-google-mobile-ads — Getting Started (Expo)](https://docs.page/invertase/react-native-google-mobile-ads)
- Existing QA: [`doc/qa/phase0.md`](../qa/phase0.md), [`doc/qa/phase1.md`](../qa/phase1.md)
- Mobile runbook: [`doc/mobile-expo.md`](../mobile-expo.md)
