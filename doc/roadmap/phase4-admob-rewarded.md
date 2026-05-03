# Phase 4 — Google AdMob (rewarded, Expo SDK 55)

Rewarded video → **coins** with **Server-Side Verification (SSV)** so grants are not client-forgeable.

**Depends on:** [Phase 2](./phase2-server-economy.md) **`economy` Edge + ledger** pattern — add **`economy_grant_ad_reward_internal`** (or equivalent) with idempotent key from SSV payload.

**Expo:** **Dev client / EAS** — AdMob is native; [not supported in Expo Go](https://docs.page/invertase/react-native-google-mobile-ads).

**Backlog mapping:** E3 tickets **SV-301–SV-303** in [`doc/sprint-plan-backlog.md`](../sprint-plan-backlog.md).

---

## Checklist

| Task | Notes |
|------|--------|
| [ ] **AdMob** | Apps + **App IDs** + **rewarded** ad unit IDs. |
| [ ] **Install** | `npx expo install react-native-google-mobile-ads`; confirm **RN 0.83 / New Architecture** compatibility (library changelog). |
| [ ] **Config plugin** | `app.config` / `app.json`: `react-native-google-mobile-ads` with `androidAppId` / `iosAppId`; optional SKAdNetwork, ATT description. |
| [ ] **Rebuild** | `expo prebuild` + `expo run:*` or **EAS Build**. |
| [ ] **Privacy** | UMP (EEA); `expo-tracking-transparency` for iOS personalized ads; init order per [Invertase — Getting Started (Expo)](https://docs.page/invertase/react-native-google-mobile-ads). |
| [ ] **Dev ads** | `TestIds.REWARDED` until production. |
| [ ] **SSV** | AdMob SSV URL → Supabase Edge verifies signature → idempotent RPC → **`wallet_ledger`**; client **`resyncWalletFromServer()`** only. |
| [ ] **`WatchAdCard`** | Remove fake timer **`addCoins`**; rewarded SDK + daily cap (`SV-303`; strengthen server-side when RPC exists). |
| [ ] **Play Console** | Declare app contains ads; Data safety / privacy policy updated. |

---

## Definition of Done

- No production coin grant from ad completion **without** SSV-verified Edge path.
- Abuse caps enforced (client minimum; server authoritative if duplicated grants attempted).

---

## References

- Index: [`README.md`](./README.md)
- Mobile runbook: [`doc/mobile-expo.md`](../mobile-expo.md)
