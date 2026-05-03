# Expo mobile app — test, migration, theme

## Can you test now?

**Yes.** The app under `mobile/` is intended to run as-is.

### Prerequisites

- Node.js LTS
- For **iOS**: Xcode + Simulator (macOS), or a physical device
- For **Android**: Android Studio SDK / emulator or device
- **Development builds** use `expo-dev-client` (installed in this repo). You install a native dev client once, then `npm run start` connects Metro to that app—not Expo Go.

### Commands (development client)

From the repo root:

```bash
cd mobile
npm install
```

**First-time native app (local compile):**

```bash
npm run ios      # Xcode Simulator — runs prebuild + build if needed
# or
npm run android  # emulator/device with adb
```

**Day-to-day:** after the dev client is installed on simulator/device:

```bash
npm run start    # expo start --dev-client
```

Open the **SpinVault** dev client on the device/simulator; it should load the bundle from Metro.

**Expo Go only (fallback):** `npm run start:go` — limited; native tabs and other native modules may not match.

**EAS cloud dev builds** (optional): install [EAS CLI](https://docs.expo.dev/build/setup/), run `eas login`, then from `mobile/`:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
# iOS Simulator-only artifact:
eas build --profile development-simulator --platform ios
```

Sanity checks already used in development:

```bash
cd mobile
npm run typecheck
npx expo-doctor
```

### What is migrated vs still “web-only”

**In `mobile/` (ported):**

- Expo Router (root gate → tabs), Native Tabs + nested stacks
- `GameProvider`, `AuthProvider`, `AppearanceProvider` (AsyncStorage where applicable)
- Play (slot machine), Rewards, Shop, Profile tabs
- Theme tokens and casino palettes; onboarding gate

**Still mainly on the Next.js tree (`/` repo root, outside `mobile/`):**

- Full marketing pages, SEO, any server components / API routes not duplicated in Expo
- Some checklist items in [implementation-status.md](./implementation-status.md) (leaderboard modals, feedback forms, etc.) are **not** all rebuilt in RN yet—the mobile app is a **game shell + core loops**, not a byte-for-byte clone of every web screen.

**Optional hardening (not required to try the build):**

- Add `react-native-gesture-handler` + root `GestureHandlerRootView` if you add gesture-heavy libraries or see navigation warnings
- Persist full `GameState` if you need survival across reinstalls (today: auth + appearance persist; game session is mostly in memory)

---

## Code style note (“classes”)

The Expo app uses **functional components and hooks** only. There are **no ES `class` React components** in `mobile/`. Styling uses **React Native `StyleSheet`** and theme objects—not CSS classes (the word “class” may appear in comments about legacy Tailwind on web).

---

## Theme — where everything lives

Theme is **code**, not a separate doc asset. Use this map:

| Role | Path |
|------|------|
| Hex palettes per machine theme + light/dark | `mobile/theme/tokens.ts` (`CasinoPalette`, `getCasinoPalette`, `hexWithAlpha`) |
| Hook used by screens/components | `mobile/lib/use-casino-theme.ts` |
| Machine theme IDs, names, shop prices | `mobile/lib/theme-config.ts` |
| System/light/dark preference | `mobile/lib/appearance-context.tsx` |
| Native semantic colors (RN `PlatformColor` via expo-router `Color`, Appearance **system** only) | `mobile/lib/native-semantic-colors.ts` (`useNativeSemanticColors`) |
| Active machine theme in game state | `mobile/lib/game-context.tsx` |
| Vanity item colors (RN-friendly) | `mobile/lib/vanity-data.ts` |

The web app’s parallel theme files (if any) remain under the Next.js tree (e.g. `lib/theme-config.ts`, `components/theme-provider.tsx`); **mobile imports only from `mobile/`.**

---

## Native tabs caveat

Tab navigation uses **`expo-router/unstable-native-tabs`** (alpha API). Test on **real iOS/Android**; **web** may differ or be unsupported for some native tab behaviors.

---

## `@expo/ui` + RN semantic colors — expand criteria

**Reference:** plan *Expo UI migration approach* (local Cursor plan; not committed as a single source file).

### Roles

| Track | Use for | Notes |
|-------|---------|--------|
| **`@expo/ui`** | Native **Host** + SwiftUI / Jetpack Compose where real native controls win (e.g. grouped notification toggles on Profile) | Beta (iOS) / alpha (Android); **not in Expo Go** — **development builds** only. |
| **RN + `Color` (`expo-router`)** | Settings-shaped **RN** rows: text, separators, input placeholders | Implemented via `mobile/lib/native-semantic-colors.ts` → **`useNativeSemanticColors`**. Tokens apply when Appearance mode is **`system`**; if the user forces light/dark, fall back to **`useCasinoTheme()`** so OS `PlatformColor` does not fight `resolvedMode`. |
| **`useCasinoTheme`** | Play, Shop, Rewards, **NativeTabs**, slot machine, shop/chest, vanity, trophies, Profile **section titles** | Brand is the product; do not replace with system gray/gold wholesale. |

### Android parity

- Ship **both** iOS and Android implementations for each Expo UI island (see `*.ios.tsx` / `*.android.tsx` next to shared types until Expo exposes universal components).
- **iOS-only** features must be called out explicitly in PR / changelog.

### Exclusions (no migration without product sign-off)

- Slot machine / Reanimated surfaces, shop rich UI / chest flows, tab bar branding, intentional rarity/VIP accent colors.

### Phase 2 (economy, IAP, ads)

Remaining server economy, RevenueCat IAP, and Google AdMob are tracked in **[`doc/roadmap/README.md`](./roadmap/README.md)** (Phases 2–4).

### Verify after changes

```bash
cd mobile && npm run typecheck
```

On device: Profile → **Notification Preferences** (native toggles on iOS/Android), toggle OS appearance and in-app Appearance (**system** vs forced) and confirm readable contrast.

If Metro logs **`Cannot find native module 'ExpoUI'`**, the JavaScript includes `@expo/ui` but the **installed dev client was built before that dependency**. Run **`npx expo prebuild`** (if needed) then **`npx expo run:ios`** / **`run:android`**, or an **EAS development build**. Until then, the app **falls back to RN notification preference rows** (`TurboModuleRegistry.get('ExpoUI')` guard + lazy `require`).
