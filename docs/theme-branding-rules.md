# SpinVault — Theme & Branding Layer Rules

> **Audience:** Product, Design, Engineering, Legal, QA.
> **Purpose:** Define the boundary between the SpinVault global brand identity and user-purchased machine skins (slot themes). This is the authoritative reference for all decisions about what themes can and cannot change.

---

## 1. Core Product Decision

**Slot themes are machine skins, not full app rebrands.**

When a user purchases and equips a theme (Vegas Classic, Cyber Neon, Treasure Island, or any future theme):

- The **slot machine** changes style. The **SpinVault app** does not.
- The user's SpinVault account, wallet, purchase history, and settings are **unaffected**.
- The SpinVault name, wordmark, icon, splash screen, and brand colors remain constant.

### Recommended in-app product copy

Use this copy wherever themes are introduced, explained, or previewed (Shop theme cards, theme selection tooltip, onboarding):

> **"Themes change your slot machine style, symbols, sounds, and win effects. Your SpinVault account, wallet, purchases, and settings stay the same."**

This copy must appear in the Shop theme section. It must not be modified to imply that a theme changes the user's account, entitlements, or legal relationship with SpinVault.

---

## 2. Core SpinVault Brand — Must Never Change

The following are owned by the SpinVault global brand and are completely independent of any purchased or equipped theme.

### Identity

| Element | Value | Why it must not change |
|---|---|---|
| App name | `SpinVault` | User trust, store listing, support, legal docs |
| App subtitle | `Lucky Slots` | Part of the formal brand identity |
| App icon | `assets/images/icon.png` | Static asset, App Store / Play Store identifier |
| Adaptive icon | `assets/images/adaptive-icon.png` | Android home screen identity |
| Splash screen | `assets/images/splash-icon.png` on `#140707` | First impression, brand recognition |
| Wordmark (in-app) | "SpinVault" label in navigation header | Persistent brand anchor across all tabs |

### Screens that must remain brand-stable

| Screen | Route / File |
|---|---|
| Onboarding (welcome, age gate, signup) | `app/onboarding.tsx` + `OnboardingScreen.tsx` |
| Login | `app/login.tsx` + `login-screen.tsx` |
| Register / Create account | `app/register.tsx` + `register-screen.tsx` |
| Forgot password | `app/forgot-password.tsx` + `forgot-password-screen.tsx` |
| Reset password | `app/reset-password.tsx` + `reset-password-screen.tsx` |
| Profile / Account | `app/(tabs)/profile/index.tsx` + `parity-sections.tsx` |
| Support (Help Center, Contact, Privacy, Terms) | `SupportSection` in `parity-sections.tsx` |
| Privacy Policy (in-app) | `LegalDocumentModal.tsx` |
| Terms of Service (in-app) | `LegalDocumentModal.tsx` |
| Tab bar chrome | `app/(tabs)/_layout.tsx` + `TabScreenStack.tsx` |
| Loading / session gate | `BrandedLoadingScreen.tsx` |
| App Store / Play Store metadata | `app.config.ts` + store listings |

### Copy that must remain brand-stable

- All legal and compliance language (Privacy Policy, Terms of Service)
- IAP / wallet trust language: "Your SpinVault vault updates automatically", "Virtual coins have no cash value and cannot be refunded"
- Support and contact information
- Age-gate disclosure: "SpinVault is for adults (18+)"
- Compliance line: "Virtual coins only. No cash value."
- All onboarding copy

---

## 3. Themes May Change

The following elements are within the scope of a machine skin and may change freely when a theme is applied.

| Element | Notes |
|---|---|
| Slot machine cabinet background | `cabinetBg` token |
| Slot machine cabinet border | `cabinetBorder` token |
| Reel background | `reelBg` token |
| Reel border | `reelBorder` token |
| Spin button gradient | `spinButtonStart` / `spinButtonEnd` tokens |
| Payline highlight color | `machineAccent` token |
| Cabinet corner pulse color | `machineAccent` token |
| Win celebration overlay color | `win` / `jackpot` tokens (machine context only) |
| Jackpot ticker glow | `jackpot` token (machine context only) |
| Theme preview art in Shop | Per-theme static imagery |
| Slot symbols | Future: per-theme symbol sets |
| Win effects / animations | Future: per-theme celebration FX |
| Background music / sound effects | Future: per-theme audio |
| Bonus meter styling | Future: per-theme bonus UI |
| Play screen surface tint | Lightly inherits from `background` / `surface` tokens |

---

## 4. Themes Must Not Change

These elements exist outside the machine and belong to the SpinVault app shell. No machine skin should ever override them.

| Element | Notes |
|---|---|
| App name / wordmark | Hardcoded as `APP_NAME = 'SpinVault'` from `shared/brand.ts` |
| Tab bar labels and icons | Navigation chrome is shell-only |
| Account identity (avatar, username, level badge) | User identity is brand-independent |
| Wallet / coin balance display | Trust-critical — must look consistent |
| IAP purchase confirmation language | Legal and trust language — must not be theme-styled |
| Privacy Policy / Terms of Service UI | Legal docs must remain neutral and readable |
| Support section | Help Center, Contact, Privacy, Terms rows |
| Legal compliance copy | Age gate, no-cash-value disclosures, compliance lines |
| App Store / Google Play metadata | Store listing is brand identity, not theme identity |
| App icon and splash | Static, not a runtime token |
| Notification content | Push notification copy uses SpinVault brand, not theme name |

---

## 5. Two-Layer Architecture (Engineering)

```
┌──────────────────────────────────────────────────────────────────┐
│  LAYER 1 — GLOBAL BRAND SHELL                                    │
│  Source: MASTER_SEMANTIC_LIGHT / MASTER_SEMANTIC_DARK            │
│          mobile/theme/tokens.ts                                  │
│                                                                  │
│  Never overridden by any machine skin.                           │
│  Hook:  getSpinVaultShellBackground(mode)  ← loading gates       │
│         getSpinVaultShellPrimary(mode)     ← gate spinners       │
│         useAppearance()  ← light/dark only, no machine skin      │
│                                                                  │
│  Screens:  onboarding · login · register · forgot/reset          │
│            profile · account · support · legal · tab bar         │
│            loading gates · app icon · splash                     │
└──────────────────────────────────────────────────────────────────┘
                    ↓ merged by useCasinoTheme()
┌──────────────────────────────────────────────────────────────────┐
│  LAYER 2 — MACHINE SKIN (user-purchased slot theme)              │
│  Source: MACHINE_SKINS in mobile/theme/tokens.ts                 │
│          Managed by:  GameProvider → currentTheme                │
│                                                                  │
│  Overrides exactly 9 tokens (MACHINE_OVERRIDE_KEYS):            │
│    cabinetBg  cabinetBorder  reelBg  reelBorder                  │
│    spinButtonStart  spinButtonEnd                                │
│    jackpot  win  machineAccent                                   │
│                                                                  │
│  Screens:  Play screen · SlotMachine · ReelGrid · ControlDeck    │
│            WinDisplay · Marquee · PaylineOverlay · SpinRow        │
└──────────────────────────────────────────────────────────────────┘
```

### How the merge works

`useCasinoTheme()` in `mobile/lib/use-casino-theme.ts`:
1. Reads `currentTheme` from `GameProvider` (`'vegas'` | `'cyber'` | `'treasure'`).
2. Reads `resolvedMode` from `AppearanceProvider` (`'dark'` | `'light'`).
3. Starts with the full Master Shell palette, then applies the skin's 9 token overrides.
4. Returns a merged `AppTheme` palette.

All screens receive a palette where shell tokens are unchanged and the 9 skin tokens reflect the user's selected theme.

---

## 6. Token Classification

### Shell-stable tokens — safe in all screens

| Token | Light | Dark | Notes |
|---|---|---|---|
| `background` | `#FFF8EA` | `#071311` | App background |
| `surface` | `#FFFFFF` | `#0D1B18` | Cards/sheets |
| `surfaceElevated` | `#FFFDF7` | `#132822` | Elevated surfaces |
| `card` | `#FFFFFF` | `#10201D` | Card background |
| `textPrimary` | `#1F2933` | `#F8FAFC` | Body text |
| `textSecondary` | `#52616B` | `#B8C7C2` | Secondary text |
| `textMuted` | `#8A94A6` | `#78908A` | Labels, captions |
| `border` | `#E7D8B8` | `#27443C` | Dividers, borders |
| `primary` | `#0F9F8C` | `#14B8A6` | Brand primary teal |
| `primaryForeground` | `#FFFFFF` | `#071311` | Text on primary |
| `accent` | `#D4AF37` | `#D4AF37` | Gold accent |
| `gold` | `#D4AF37` | `#D4AF37` | **Use for premium reward indicators outside machine UI** |
| `bonus` | `#8B5CF6` | `#A855F7` | Purple reward |
| `freeSpin` | `#06B6D4` | `#22D3EE` | Cyan free-spin indicator |
| `destructive` | `#DC2626` | `#F87171` | Error/danger |
| `overlay` | `rgba(31,41,51,0.48)` | `rgba(7,19,17,0.62)` | Modal backdrops |

> **Rule for reward displays outside the machine:** use `t.gold` (always `#D4AF37`) for premium coin amounts, weekly bonuses, and jackpot prize labels in profile, rewards, and shop. Never use `t.jackpot` for these — Vegas skin maps `t.jackpot` to red, which reads as a penalty.

### Machine skin tokens — Play screen and slot components only

| Token | Default | Vegas dark | Cyber dark | Treasure dark | Restriction |
|---|---|---|---|---|---|
| `jackpot` | `#FFD700` gold | **`#ef4444` red** | **`#e879f9` pink** | `#fbbf24` amber | ⛔ Machine only |
| `win` | `#22C55E` green | `#34d399` | `#4ade80` | `#4ade80` | ⚠️ Machine preferred |
| `machineAccent` | `#14B8A6` | `#D4AF37` gold | `#22d3ee` cyan | `#2dd4bf` teal | ⛔ Machine only |
| `cabinetBg` | `#0D1B18` | `#0f0c0b` | `#080914` | `#0c1214` | ⛔ Machine only |
| `cabinetBorder` | `#27443C` | `#b8860b` | `#22d3ee` | `#d4a84b` | ⛔ Machine only |
| `reelBg` | `#071311` | `#0a0908` | `#060712` | `#0a1012` | ⛔ Machine only |
| `reelBorder` | `#27443C` | `#9a7b48` | `#22d3ee` | `#c9983a` | ⛔ Machine only |
| `spinButtonStart` | `#14B8A6` | `#b03030` | `#c026d3` | `#14b8a6` | ⛔ Machine only |
| `spinButtonEnd` | `#0F766E` | `#8b2323` | `#86198f` | `#0d9488` | ⛔ Machine only |

---

## 7. Screen Classification

### Layer 1 — Global Brand Shell

| Screen | File | Shell hook |
|---|---|---|
| Root layout / system UI | `app/_layout.tsx` | `getSpinVaultShellBackground` |
| Onboarding loading gate | `app/onboarding.tsx` | `getSpinVaultShellBackground` |
| Login gate | `app/login.tsx` | `getSpinVaultShellBackground` |
| Register / Forgot / Reset gates | `app/register.tsx` et al. | `getSpinVaultShellBackground` |
| Onboarding UI | `components/onboarding/OnboardingScreen.tsx` | `useCasinoTheme` (shell-stable only) |
| Login / Register UI | `components/auth/*` | `useCasinoTheme` (shell-stable only) |
| Profile screen | `app/(tabs)/profile/index.tsx` | `useCasinoTheme` (shell-stable only) |
| Profile sections | `components/profile/parity-sections.tsx` | `useCasinoTheme` (shell-stable only) |
| Tab navigation | `components/navigation/TabScreenStack.tsx` | `useCasinoTheme` (shell-stable only) |
| Legal modal | `components/modals/LegalDocumentModal.tsx` | `useCasinoTheme` (shell-stable only) |
| Loading screen | `components/ui/BrandedLoadingScreen.tsx` | `useCasinoTheme` (shell-stable only) |

### Layer 2 — Machine Skin

| Component | File | Skin tokens used |
|---|---|---|
| Play screen | `app/(tabs)/play/index.tsx` | `background`, `surface` |
| Slot machine cabinet | `components/slot-machine/SlotMachine.tsx` | `cabinetBg`, `cabinetBorder`, `machineAccent` |
| Reel grid | `components/slot-machine/ReelGrid.tsx` | `reelBg`, `reelBorder`, `machineAccent`, `win`, `jackpot` |
| Control deck | `components/slot-machine/ControlDeck.tsx` | `cabinetBg`, `cabinetBorder`, `spinButtonStart`, `spinButtonEnd` |
| Win display | `components/slot-machine/WinDisplay.tsx` | `jackpot`, `win` |
| Marquee ticker | `components/slot-machine/Marquee.tsx` | `jackpot` |
| Recent spins row | `components/slot-machine/RecentSpinsRow.tsx` | `jackpot`, `win` |
| Slot info modal | `components/slot-machine/InfoModal.tsx` | `jackpot` (payout table) |
| Payline overlay | `components/slot-machine/PaylineOverlay.tsx` | Machine context |

---

## 8. Rules for New Components

**Shell screen (onboarding, auth, profile, legal, support):**
→ Use only shell-stable tokens. Never use `t.jackpot`, `t.machineAccent`, `t.cabinetBg`, `t.reelBg`, `t.spinButtonStart`, or `t.spinButtonEnd`.
→ For premium reward indicators: `t.gold`. For success states: `t.win` or `t.unlocked`. For info highlights: `t.primary`.

**Play screen / slot machine:**
→ All tokens are appropriate.

**Rewards / Shop / Daily screen:**
→ Shell-stable tokens for UI chrome. Use `t.gold` for coin amounts, prize labels, and bonus indicators. Avoid `t.jackpot`.

---

## 9. Adding a New Machine Skin (Engineering Checklist)

Every new purchasable theme must follow this checklist before being added to the codebase.

### Technical requirements

- [ ] Add theme ID to `CasinoThemeId` in `mobile/theme/tokens.ts`
- [ ] Add `MACHINE_SKINS` entry with both `dark` and `light` variants, overriding only the 9 `MACHINE_OVERRIDE_KEYS`
- [ ] Add theme to `GameState.ownedThemes` initial state and purchase unlock logic in `game-context.tsx`
- [ ] Add shop preview artwork and a theme card in the Shop screen
- [ ] Verify no shell tokens (`background`, `textPrimary`, `primary`, `card`, etc.) are modified by the new skin
- [ ] Run the full QA checklist (Section 10) with the new theme active

### Theme spec template

Each new paid theme must be documented in the theme spec before implementation:

```
Theme Name:         ___________________________
Internal ID:        ___________________________  (e.g. 'pharaoh', 'ocean')
Description:        ___________________________
Preview image:      assets/images/store-offers/[theme-id]-preview.png
Price (virtual / IAP):  ___________________________

Accent palette:
  cabinetBg (dark):        ___________________________
  cabinetBg (light):       ___________________________
  cabinetBorder (dark):    ___________________________
  cabinetBorder (light):   ___________________________
  reelBg (dark):           ___________________________
  reelBg (light):          ___________________________
  reelBorder (dark):       ___________________________
  reelBorder (light):      ___________________________
  spinButtonStart (dark):  ___________________________
  spinButtonStart (light): ___________________________
  spinButtonEnd (dark):    ___________________________
  spinButtonEnd (light):   ___________________________
  jackpot (dark):          ___________________________
  jackpot (light):         ___________________________
  win (dark):              ___________________________
  win (light):             ___________________________
  machineAccent (dark):    ___________________________
  machineAccent (light):   ___________________________

Slot symbol set:    [ ] New symbols  [ ] Shared symbols  (describe: _____________)
Win effects:        ___________________________
Sound/music notes:  ___________________________
Affects Play screen only:  [ ] Yes  [ ] No — describe exceptions: _____________

Compliance note (required):
  [ ] This theme does not imply real-money gambling, cash prizes, or real currency.
  [ ] This theme does not claim or suggest any guaranteed win rate or payout.
  [ ] The theme name and description do not reference real casino brands, real
      locations, or licensed IP unless rights are confirmed.
  [ ] Theme preview images do not show cash, currency symbols, or prize amounts.
  [ ] The theme does not override any legal, support, onboarding, or auth UI.

Approved by:        ___________________________ (product)
                    ___________________________ (legal, if name/art involves IP)
```

---

## 10. QA Checklist (Run After Every Theme Change)

### For each theme: Vegas Classic → Cyber Neon → Treasure Island

**Play screen / slot machine (must change):**
- [ ] Cabinet colors change to match the theme
- [ ] Spin button gradient changes (red for Vegas, purple for Cyber, teal for Treasure)
- [ ] Reel background and borders change
- [ ] Win/jackpot celebration colors change per theme
- [ ] Payline highlight color changes per theme
- [ ] Recent spins row chip colors change per theme

**Global brand shell (must NOT change):**
- [ ] Onboarding: SpinVault teal primary button, gold accent, correct background color
- [ ] Age gate: "SpinVault is for adults (18+)" text displays in shell `textSecondary`
- [ ] Login: "SpinVault" brand kicker visible in `textMuted`, teal primary button
- [ ] Register, Forgot password, Reset password: brand-stable appearance
- [ ] Profile header: avatar, username, level badge — no machine-skin colors
- [ ] Profile stats and coin ledger: amounts in shell text colors
- [ ] Daily rewards — weekly streak bonus coin amount: displays in **gold** (#D4AF37), never red or pink
- [ ] Daily spin wheel: no red or pink segment; all 8 segments are reward-positive colors
- [ ] Missions tab: completed badges stay green; no red/pink indicators
- [ ] Support section: Help Center, Contact Support, Privacy Policy, Terms of Service rows — shell colors only
- [ ] Legal document modal (Privacy Policy and Terms of Service): shell background, shell text, no machine-skin bleeds
- [ ] IAP purchase confirmation dialog: "Virtual coins have no cash value and cannot be refunded" — standard copy, shell colors
- [ ] "Restore Purchases" toast: shell colors
- [ ] App icon on home screen: unchanged
- [ ] Splash screen on cold launch: unchanged

**Shop screen:**
- [ ] Theme cards correctly indicate which theme is active (`Active` label)
- [ ] Coin pack listings: amounts, prices, and CTA buttons use shell colors
- [ ] Starter bundle text and badge: shell colors

**After switching back to default / a different theme:**
- [ ] Play screen reverts correctly
- [ ] All shell screens remain unchanged throughout all theme switches

---

## 11. Asset Boundaries

| Asset | Controlled by | Notes |
|---|---|---|
| App icon (`assets/images/icon.png`) | Static PNG | Never a runtime token — always SpinVault icon |
| Adaptive icon (`assets/images/adaptive-icon.png`) | Static PNG | Android only, static |
| Splash image (`assets/images/splash-icon.png`) | Static PNG | Never changes at runtime |
| Splash background `#140707` | `app.config.ts` | Cinematic crimson, splash-only — not a runtime token |
| Machine cabinet appearance | `cabinetBg`, `cabinetBorder` tokens | Changes per skin |
| Reel background appearance | `reelBg`, `reelBorder` tokens | Changes per skin |
| Slot symbols | `SlotSymbol.tsx` | Currently theme-independent; future skins may supply symbol sets |
| Theme preview art | `assets/images/store-offers/` | Per-theme static images, used in Shop only |

---

## 12. Relationship to Other Docs

| Doc | What it covers |
|---|---|
| `docs/legal-launch-checklist.md` | Legal/support URL placeholders, trademark status, lawyer review |
| `shared/brand.ts` | `APP_NAME`, `APP_TAGLINE`, `APP_COMPLIANCE_LINE` constants |
| `shared/legal-documents.ts` | In-app Privacy Policy and Terms of Service copy (draft) |
| `mobile/theme/tokens.ts` | Master Shell palette + `MACHINE_OVERRIDE_KEYS` with inline layer docs |
| `mobile/lib/use-casino-theme.ts` | `useCasinoTheme()` with full two-layer architecture comment block |

---

*Last updated: 2026-05-05*
*Architecture owner: assign before launch*
*Product owner: assign before launch*
