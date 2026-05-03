# SpinVault — backlog & sprint plan

Working doc for **mobile-first** delivery. Copy tickets into Jira / Linear / GitHub Issues as needed. IDs are stable (`SV-*`) for references in PRs.

---

## Assumptions

| Item | Default |
|------|---------|
| Sprint length | **2 weeks** |
| Focus | **`mobile/`** shipped to TestFlight / Play internal track |
| Web | Secondary unless product says otherwise |
| Ceremonies | Sprint goal + backlog refinement mid-sprint; DoD on every ticket |

### Definition of Done (baseline)

- Typecheck passes (`mobile`: `npm run typecheck`).
- Tested on **one physical device** + simulator for touched flows.
- Analytics event added/updated if user-visible monetization or funnel changes.
- Copy matches behavior (no “simulated” strings on production builds unless behind `__DEV__`).

---

## Priority tiers

| Tier | Meaning |
|------|---------|
| **P0** | Blocks store submission or breaks trust (payments, restore, obvious fraud). |
| **P1** | Launch-quality retention / monetization / parity with promises in UI. |
| **P2** | Growth, social, ops — ship soon after v1. |
| **P3** | Nice-to-have polish and experiments. |

---

## Epics

**Roadmap (phased delivery):** [`doc/roadmap/README.md`](./roadmap/README.md) — Phase 2 server economy → Phase 3 RevenueCat → Phase 4 AdMob.

1. **E1 — Store-ready monetization**  
2. **E2 — Backend & persistence**  
3. **E3 — Ads & rewarded video**  
4. **E4 — Growth (referrals)**  
5. **E5 — Social & leaderboards**  
6. **E6 — Quality, fairness & compliance**  
7. **E7 — Launch / ASO / ops**

---

## Ticket backlog

### E1 — Store-ready monetization

| ID | Title | Priority | Estimate | Notes |
|----|--------|----------|----------|--------|
| **SV-101** | RevenueCat SDK wired + sandbox products for coin packs | P0 | L | Map `pack.id` ↔ App Store / Play product IDs; mirror starter bundle. |
| **SV-102** | Purchase flow: success/failure UI, pending state, receipt → grant coins | P0 | M | Replace direct `addCoins` in shop for real SKUs only. |
| **SV-103** | Implement real **Restore purchases** + bind RC `logIn`/`logOut` to Supabase user | P0 | M | Remove stub in `auth-context`; Profile toast accurate. |
| **SV-104** | Consumer confusion audit: remove/limit “simulated IAP” in release builds | P1 | S | Env-based or build flavor. |

**Dependencies:** App Store Connect + Play Console products created; RevenueCat project; secrets in EAS/CI.

---

### E2 — Backend & persistence

| ID | Title | Priority | Estimate | Notes |
|----|--------|----------|----------|--------|
| **SV-201** | Persist game wallet + progression (AsyncStorage or SQLite) | P1 | L | Coins, themes owned, vanity, missions streak baseline — align with `game-context` comment. |
| **SV-202** | Supabase schema for optional server truth (wallet events, referrals) | P1 | L | Start with append-only `wallet_events` + RLS. |
| **SV-203** | Help & feedback → backend (Supabase table or support email pipe) | P2 | M | Replace “simulated” in `HelpFeedback`. |

---

### E3 — Ads & rewarded video

| ID | Title | Priority | Estimate | Notes |
|----|--------|----------|----------|--------|
| **SV-301** | Integrate rewarded ad SDK (e.g. AdMob / GMA) with Expo dev build | P1 | L | Replace `watchAd` mock; reward only on SDK callback. |
| **SV-302** | ATT + UMP (iOS) / consent flows where required | P1 | M | Before personalized ads in regulated regions. |
| **SV-303** | Daily cap + abuse limits aligned with ads UI | P1 | S | Already have `maxDailyAds`; verify server-side if backend exists. |

---

### E4 — Growth (referrals)

| ID | Title | Priority | Estimate | Notes |
|----|--------|----------|----------|--------|
| **SV-401** | Deep link + invite URL (`https` / app scheme) mobile-only | P2 | L | Stash referral token until post-signup. |
| **SV-402** | Referral claim API + anti-abuse (one referee reward, activity gate) | P2 | L | Supabase RPC or Edge Function. |
| **SV-403** | Invite UI in Profile/Rewards + share sheet | P2 | M | |

---

### E5 — Social & leaderboards

| ID | Title | Priority | Estimate | Notes |
|----|--------|----------|----------|--------|
| **SV-501** | Replace mock `WeeklyLeaderboard` with backend leaderboard | P2 | L | Weekly reset job or computed query; minimal PII. |
| **SV-502** | Gift inbox: either MVP backend or hide until ready | P2 | S | Rewards tab placeholder today. |

---

### E6 — Quality, fairness & compliance

| ID | Title | Priority | Estimate | Notes |
|----|--------|----------|----------|--------|
| **SV-601** | Stronger RNG for reel outcomes (`crypto.getRandomValues` fallback) | P3 | S | Document behavior in code comment. |
| **SV-602** | Internal RTP / simulation script or spreadsheet | P3 | M | Not user-facing legal claim; engineering confidence. |
| **SV-603** | Loot chest odds copy audit vs App Store / Play disclosure rules | P1 | S | If chest is purchase-adjacent with real money path. |
| **SV-604** | Align “jackpot” naming (`isJackpot` vs `winType`) in UI copy | P3 | S | |

---

### E7 — Launch / ASO / ops

| ID | Title | Priority | Estimate | Notes |
|----|--------|----------|----------|--------|
| **SV-701** | Store listing: screenshots, preview video, subtitle keywords | P1 | M | CPPs later (iOS). |
| **SV-702** | Privacy policy + data safety form + encryption export compliance | P0 | M | Already touched `ITSAppUsesNonExemptEncryption`; keep accurate. |
| **SV-703** | Push notifications for daily rewards (optional v1.1) | P2 | L | Was in `implementation-status` optional list. |
| **SV-704** | EAS pipelines + staging env for RC | P1 | S | |

---

## Suggested sprints (example roadmap)

Adjust capacity to your team; ordering assumes **monetization before growth**.

### Sprint 1 — “Paid loop works”

**Goal:** User can buy coins with real IAP and restore on a new device.

| Tickets | Outcome |
|---------|---------|
| SV-101, SV-102, SV-103 | RevenueCat + shop + restore |
| SV-104 | Production copy pass for shop |
| SV-702 (start) | Privacy / data disclosure checklist |

**Exit criteria:** Sandbox purchase end-to-end on iOS **or** Android (one platform OK for sprint 1 if parallelized next).

---

### Sprint 2 — “Ship-safe retention”

**Goal:** Progress survives reinstall; fewer “fake” flows.

| Tickets | Outcome |
|---------|---------|
| SV-201 | Local persistence for core economy |
| SV-301 (spike → MVP) | One rewarded ad path works in dev build |
| SV-603 | Chest/odds disclosure if applicable |

**Exit criteria:** Kill app → reopen → coins/themes intact; watch-ad grants coins via SDK on device.

---

### Sprint 3 — “Consent + polish”

**Goal:** Ads compliant; monetization hardened.

| Tickets | Outcome |
|---------|---------|
| SV-302, SV-303 | ATT/consent + caps |
| SV-202 (thin slice) | Optional: sync wallet events for fraud/debug |
| SV-701 | First store listing draft |

---

### Sprint 4 — “Social truth”

**Goal:** Leaderboard + inbox either real or intentionally scoped.

| Tickets | Outcome |
|---------|---------|
| SV-501 | Live leaderboard OR cut feature flag |
| SV-502 | Inbox MVP or hidden |
| SV-203 | Feedback pipeline |

---

### Sprint 5 — “Growth”

**Goal:** Referral flywheel mobile-only.

| Tickets | Outcome |
|---------|---------|
| SV-401, SV-402, SV-403 | Referrals E2E |

---

### Sprint 6 — “Iterate”

| Tickets | Mix from SV-601–604, SV-703, CPP/ASO experiments |

---

## Risks & dependencies (senior notes)

1. **Platform policy:** Simulated gambling + IAP + ads — verify **network acceptance** and **age rating** before scaling UA.  
2. **Expo native modules:** Ads + ATT need **dev client / EAS** alignment; document in `doc/mobile-expo.md`.  
3. **Single source of truth:** If leaderboard goes live, decide whether **client wallet** is authoritative or **server** — avoid dual writes without reconciliation.  
4. **Scope creep:** Referrals and leaderboards **after** IAP + persistence reduces rework.

---

## Next actions for you

1. Import `SV-*` rows into your tracker; map **L/M/S** to your team’s points.  
2. Set **Sprint 1 goal** in writing in Standup.  
3. Block SV-101 until **product IDs** exist in both consoles + RevenueCat.

_Last updated: backlog derived from repo state + product discussions (mobile shop, auth stubs, rewards placeholders)._
