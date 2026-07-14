# AL Yafour Mobile - Design System v3 (web-aligned)

Single source of truth: `constants/theme.ts` (colors), `constants/spacing.ts`
(spacing, radius, typography). This document describes the ACTUAL tokens -
if code and doc disagree, fix the code or update this doc in the same PR.

## Brand

Aligned with the web frontend (`ERB-core-Frontend/styles/tokens/`):

| Role | Light | Dark |
|---|---|---|
| Brand / primary / tint | `#C9943A` | `#D4A44C` |
| Background | `#F7F4F0` | `#111827` |
| Surface / card | `#FFFFFF` | `#1A2235` |
| Text / secondary | `#1C1414` / `#6F625E` | `#F1F5F9` / `#B0BAC9` |
| Border | `#E2DBD6` | `#1E2D45` |
| Success | `#3A7D52` | `#6EAF86` |
| Warning | `#B7791F` | `#DBA23C` |
| Danger | `#DC2626` | `#F87171` |
| Info | brand gold (like web - no blue) | brand gold |

Icon-tile tints for module cards come from `ModuleTints` in `theme.ts` -
never invent per-screen hexes.

## Rules

1. **No hardcoded hex in screens.** Pull from `Colors[useColorScheme()]`.
   The only exception is content that must be identical in both themes
   (rare - justify in a comment).
2. **One component family.** `AppButton`, `AppCard`, `AppBadge`, `AppHeader`,
   `AppScreen`, `AppEmptyState`, `AppBottomSheet`, `Input`, `Checkbox`,
   `SearchableDropdown`, `DatePickerInput`. The legacy `Button`/`Card`/
   `Badge`/`ScreenHeader` and `constants/common-styles.ts` were deleted -
   do not reintroduce them.
3. **List screens** follow the standard branch:
   `loading -> AppEmptyState(loading)` -> `error -> AppEmptyState(error + Retry)`
   -> `empty -> AppEmptyState(empty)` -> `FlatList`.
4. **Forms**: shared `Input` (never raw `TextInput` for user-facing fields),
   `KeyboardAvoidingView` (`padding` iOS / `height` Android) around every
   form ScrollView, field-level `error` prop over toast-only validation.
5. **Accessibility**: interactive elements get `accessibilityRole` and a
   meaningful `accessibilityLabel`. The shared components do this for you -
   custom touchables must do it themselves. Minimum touch target 44px
   (or `hitSlop` to reach it).
6. **Safe areas**: `SafeAreaView edges={['top']}` + inset-aware bottom bars.
7. **Dark mode** is user-toggled (Settings) via `ThemeContext`; every screen
   must render correctly in both schemes - no `Colors.light.*` literals.

## Auth & security architecture (do not regress)

- Tokens live in **SecureStore** (`lib/secure-storage.ts`), never AsyncStorage.
- All requests go through `lib/api.ts`: single-flight refresh mutex,
  rotation-aware (`/api/auth/token/refresh/`), resume-time proactive refresh.
- `components/AuthGate.tsx` is the global session guard;
  `components/AppLockGate.tsx` + `lib/app-lock.ts` implement biometric
  App Lock (enable/disable both require live authentication).
- Logout always sends `{ refresh }` so the backend blacklists the session.
