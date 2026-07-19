import { Platform } from 'react-native';

/**
 * Al Yafour ERP — Design System v3 (web-aligned)
 * Single source of truth for all colors.
 *
 * Brand parity with the web frontend (ERB-core-Frontend/styles/tokens):
 *   brand gold  #C9943A (light) / #D4A44C (dark)  ← was navy #0B1F33
 *   warm neutrals (#F7F4F0 page, #E2DBD6 borders, #1C1414 ink)
 *   status: success green #3A7D52, error red #DC2626, info anchored to brand
 * All key names are unchanged — every screen consuming Colors[scheme].* moves
 * to the new identity without code changes.
 */

// Shared literals — single source for the hand-copied duplicate hex values
// below (each literal appears exactly once here). Keys carrying a
// "// compat alias" comment are left as independent hardcoded literals —
// each one is still consumed directly by at least one screen elsewhere in
// the app (verified via a repo-wide grep) and must not be removed. Aliases
// that had zero remaining consumers after the app/(tabs)/profile.tsx and
// app/(tabs)/notifications.tsx migration have already been deleted.
const LIGHT_GOLD         = '#C9943A';
const LIGHT_GOLD_SOFT    = '#F7EEDD';
const LIGHT_WHITE        = '#FFFFFF';
const LIGHT_MUTED        = '#9C8F8B';
const LIGHT_BORDER       = '#E2DBD6';
const LIGHT_SURFACE_TINT = '#FAF8F4';

const DARK_GOLD         = '#D4A44C';
const DARK_GOLD_SOFT    = '#2E2617';
const DARK_GOLD_HOVER   = '#E0B86D';
const DARK_INK          = '#1C1414';
const DARK_SURFACE      = '#1A2235';
const DARK_BORDER       = '#1E2D45';
const DARK_MUTED        = '#94A3B8';
const DARK_SURFACE_TINT = '#1E2637';

export const Colors = {
  light: {
    // ── Page backgrounds (warm neutrals, matching web --bg) ───────────────
    background:           '#F7F4F0',
    backgroundSecondary:  '#F2EDE7',   // compat alias
    surfaceSoft:          LIGHT_SURFACE_TINT,

    // ── Surfaces (cards, panels) ─────────────────────────────────────────
    surface:              LIGHT_WHITE,
    surfaceElevated:      LIGHT_WHITE,
    surfaceMuted:         LIGHT_SURFACE_TINT,   // icon tiles, section bg
    card:                 '#FFFFFF',   // compat alias
    cardHighlight:        '#FAF8F4',   // compat alias

    // ── Text (warm ink) ──────────────────────────────────────────────────
    textPrimary:          '#1C1414',
    textSecondary:        '#6F625E',
    textMuted:            LIGHT_MUTED,
    textTertiary:         '#9C8F8B',   // compat alias
    textDisabled:         '#C9BFBA',
    textInverse:          LIGHT_WHITE,
    text:                 '#1C1414',   // compat alias

    // ── Borders ──────────────────────────────────────────────────────────
    border:               LIGHT_BORDER,
    borderStrong:         '#CFC5BE',
    borderLight:          '#EDE7E1',   // compat alias → divider
    borderDark:           '#CFC5BE',   // compat alias
    borderFocus:          LIGHT_GOLD,
    divider:              '#EDE7E1',

    // ── Primary (brand gold — web --brand) ───────────────────────────────
    primary:              LIGHT_GOLD,
    primaryHover:         '#B8832E',
    primarySoft:          LIGHT_GOLD_SOFT,
    primaryText:          LIGHT_WHITE,

    tint:                 '#C9943A',   // compat alias → brand gold
    tintSubtle:           'rgba(201,148,58,0.08)',  // compat alias
    accentBorder:         '#E3CFA6',   // compat alias

    // ── Semantic states (web-aligned; warning kept distinct from brand) ───
    success:              '#3A7D52',
    successBg:            '#EAF4ED',
    successText:          '#2C5F3F',

    warning:              '#B7791F',
    warningBg:            '#FBF3E4',
    warningSurface:       '#FBF3E4',   // compat alias
    warningText:          '#8A5A15',

    danger:               '#DC2626',
    dangerBg:             '#FDECEC',
    dangerSurface:        '#FDECEC',   // compat alias
    error:                '#DC2626',   // compat alias
    errorText:            '#991B1B',

    // Info follows the web system: anchored to brand gold, no blue
    info:                 LIGHT_GOLD,
    infoBg:               LIGHT_GOLD_SOFT,
    infoText:             '#8A6420',

    // ── Navigation ────────────────────────────────────────────────────────
    tabBar:               LIGHT_WHITE,
    tabBarBorder:         LIGHT_BORDER,
    tabBarActive:         LIGHT_GOLD,
    tabBarInactive:       LIGHT_MUTED,
    header:               LIGHT_WHITE,
    headerBorder:         LIGHT_BORDER,

    // ── Shadows ───────────────────────────────────────────────────────────
    shadow:               'rgba(28,20,20,0.08)',
    shadowDark:           'rgba(28,20,20,0.14)',

    // ── Icons ─────────────────────────────────────────────────────────────
    icon:                 LIGHT_MUTED,
    iconActive:           LIGHT_GOLD,
    iconInactive:         LIGHT_MUTED,
  },

  dark: {
    // ── Page backgrounds (web dark tokens) ────────────────────────────────
    background:           '#111827',
    backgroundSecondary:  '#151E2E',   // compat alias
    surfaceSoft:          DARK_SURFACE_TINT,

    // ── Surfaces ─────────────────────────────────────────────────────────
    surface:              DARK_SURFACE,
    surfaceElevated:      '#212B40',
    surfaceMuted:         DARK_SURFACE_TINT,
    card:                 '#1A2235',   // compat alias
    cardHighlight:        '#212B40',   // compat alias

    // ── Text ─────────────────────────────────────────────────────────────
    textPrimary:          '#F1F5F9',
    textSecondary:        '#B0BAC9',
    textMuted:            DARK_MUTED,
    textTertiary:         '#94A3B8',   // compat alias
    textDisabled:         '#46536B',
    textInverse:          DARK_INK,
    text:                 '#F1F5F9',   // compat alias

    // ── Borders ──────────────────────────────────────────────────────────
    border:               DARK_BORDER,
    borderStrong:         '#2A3C5C',
    borderLight:          '#1A2740',   // compat alias → divider
    borderDark:           '#2A3C5C',   // compat alias
    borderFocus:          DARK_GOLD,
    divider:              '#1A2740',

    // ── Primary (brand gold, dark variant — web --brand dark) ─────────────
    primary:              DARK_GOLD,
    primaryHover:         DARK_GOLD_HOVER,
    primarySoft:          DARK_GOLD_SOFT,
    primaryText:          DARK_INK,

    tint:                 '#D4A44C',   // compat alias
    tintSubtle:           'rgba(212,164,76,0.10)',
    accentBorder:         '#4A3D22',   // compat alias

    // ── Semantic states ───────────────────────────────────────────────────
    success:              '#6EAF86',
    successBg:            '#14261C',
    successText:          '#8FCBA5',

    warning:              '#DBA23C',
    warningBg:            '#2C2211',
    warningSurface:       '#2C2211',   // compat alias
    warningText:          '#E8BE6B',

    danger:               '#F87171',
    dangerBg:             '#331B1B',
    dangerSurface:        '#331B1B',   // compat alias
    error:                '#F87171',   // compat alias
    errorText:            '#FCA5A5',

    // Info follows the web system: brand-gold anchored
    info:                 DARK_GOLD,
    infoBg:               DARK_GOLD_SOFT,
    infoText:             DARK_GOLD_HOVER,

    // ── Navigation ────────────────────────────────────────────────────────
    tabBar:               DARK_SURFACE,
    tabBarBorder:         DARK_BORDER,
    tabBarActive:         DARK_GOLD,
    tabBarInactive:       DARK_MUTED,
    header:               DARK_SURFACE,
    headerBorder:         DARK_BORDER,

    // ── Shadows ───────────────────────────────────────────────────────────
    shadow:               'rgba(0,0,0,0.25)',
    shadowDark:           'rgba(0,0,0,0.45)',

    // ── Icons ─────────────────────────────────────────────────────────────
    icon:                 DARK_MUTED,
    iconActive:           DARK_GOLD,
    iconInactive:         DARK_MUTED,
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof Colors.light;

/**
 * Semantic tints for module/category icon tiles (dashboard, HR, settings).
 * Replaces the old scattered hardcoded rainbow (#1D4ED8 blue, #7C3AED purple,
 * #15803D green…) with a warm, brand-adjacent set used via tokens only.
 */
export const ModuleTints = {
  light: {
    procurement: { fg: '#C9943A', bg: '#F7EEDD' },
    hr:          { fg: '#3A7D52', bg: '#EAF4ED' },
    finance:     { fg: '#8A5A15', bg: '#FBF3E4' },
    operations:  { fg: '#6F625E', bg: '#F2EDE7' },
    admin:       { fg: '#1C1414', bg: '#EDE7E1' },
  },
  dark: {
    procurement: { fg: '#D4A44C', bg: '#2E2617' },
    hr:          { fg: '#6EAF86', bg: '#14261C' },
    finance:     { fg: '#E8BE6B', bg: '#2C2211' },
    operations:  { fg: '#B0BAC9', bg: '#1E2637' },
    admin:       { fg: '#F1F5F9', bg: '#212B40' },
  },
} as const;

export const Fonts = Platform.select({
  ios:     { sans: 'system-ui', mono: 'ui-monospace' },
  default: { sans: 'normal', mono: 'monospace' },
  web:     { sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", mono: 'monospace' },
});

/**
 * Shared card drop-shadow recipe — a middle ground of the values previously
 * hand-copied (and drifting) across app/(tabs)/index.tsx, app/(tabs)/hr.tsx,
 * and app/dashboard.tsx. Spread into a card style: `{ ...CARD_SHADOW }`.
 * app/(tabs)/index.tsx, app/(tabs)/hr.tsx, app/dashboard.tsx,
 * app/hr/attendance-history.tsx, app/hr/payslip.tsx, and app/hr/requests.tsx
 * have all been migrated onto this export. Other screens outside that set
 * may still declare their own local shadow copies.
 */
export const CARD_SHADOW = {
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius:  6,
  elevation:     2,
} as const;
