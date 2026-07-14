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
export const Colors = {
  light: {
    // ── Page backgrounds (warm neutrals, matching web --bg) ───────────────
    background:           '#F7F4F0',
    backgroundSecondary:  '#F2EDE7',   // compat alias
    backgroundTertiary:   '#EDE7DF',   // compat alias
    surfaceSoft:          '#FAF8F4',

    // ── Surfaces (cards, panels) ─────────────────────────────────────────
    surface:              '#FFFFFF',
    surfaceElevated:      '#FFFFFF',
    surfaceMuted:         '#FAF8F4',   // icon tiles, section bg
    card:                 '#FFFFFF',   // compat alias
    cardHighlight:        '#FAF8F4',   // compat alias

    // ── Text (warm ink) ──────────────────────────────────────────────────
    textPrimary:          '#1C1414',
    textSecondary:        '#6F625E',
    textMuted:            '#9C8F8B',
    textTertiary:         '#9C8F8B',   // compat alias
    textDisabled:         '#C9BFBA',
    textInverse:          '#FFFFFF',
    text:                 '#1C1414',   // compat alias
    text2:                '#6F625E',   // compat alias

    // ── Borders ──────────────────────────────────────────────────────────
    border:               '#E2DBD6',
    borderStrong:         '#CFC5BE',
    borderLight:          '#EDE7E1',   // compat alias → divider
    borderDark:           '#CFC5BE',   // compat alias
    borderFocus:          '#C9943A',
    divider:              '#EDE7E1',

    // ── Primary (brand gold — web --brand) ───────────────────────────────
    primary:              '#C9943A',
    primaryHover:         '#B8832E',
    primarySoft:          '#F7EEDD',
    primaryText:          '#FFFFFF',
    primarySubtle:        '#F7EEDD',   // compat alias

    tint:                 '#C9943A',   // compat alias → brand gold
    tintSecondary:        '#B8832E',   // compat alias
    tintLight:            '#F7EEDD',   // compat alias
    tintDark:             '#A07228',   // compat alias
    tintSubtle:           'rgba(201,148,58,0.08)',  // compat alias
    accent:               '#C9943A',   // compat alias
    accentLight:          '#F7EEDD',   // compat alias
    accentBorder:         '#E3CFA6',   // compat alias
    accentSubtle:         'rgba(201,148,58,0.06)',  // compat alias

    // ── Semantic states (web-aligned; warning kept distinct from brand) ───
    success:              '#3A7D52',
    successBg:            '#EAF4ED',
    successLight:         '#EAF4ED',   // compat alias
    successSurface:       '#EAF4ED',   // compat alias
    successText:          '#2C5F3F',

    warning:              '#B7791F',
    warningBg:            '#FBF3E4',
    warningLight:         '#FBF3E4',   // compat alias
    warningSurface:       '#FBF3E4',   // compat alias
    warningText:          '#8A5A15',

    danger:               '#DC2626',
    dangerBg:             '#FDECEC',
    dangerSurface:        '#FDECEC',   // compat alias
    dangerLight:          '#FDECEC',   // compat alias
    error:                '#DC2626',   // compat alias
    errorLight:           '#FDECEC',   // compat alias
    errorText:            '#991B1B',

    // Info follows the web system: anchored to brand gold, no blue
    info:                 '#C9943A',
    infoBg:               '#F7EEDD',
    infoLight:            '#F7EEDD',   // compat alias
    infoSurface:          '#F7EEDD',   // compat alias
    infoText:             '#8A6420',

    // ── Navigation ────────────────────────────────────────────────────────
    tabBar:               '#FFFFFF',
    tabBarBorder:         '#E2DBD6',
    tabBarActive:         '#C9943A',
    tabBarInactive:       '#9C8F8B',
    header:               '#FFFFFF',
    headerBorder:         '#E2DBD6',
    tabIconDefault:       '#9C8F8B',   // compat alias
    tabIconSelected:      '#C9943A',   // compat alias

    // ── Shadows ───────────────────────────────────────────────────────────
    shadow:               'rgba(28,20,20,0.08)',
    shadowDark:           'rgba(28,20,20,0.14)',

    // ── Icons ─────────────────────────────────────────────────────────────
    icon:                 '#9C8F8B',
    iconActive:           '#C9943A',
    iconInactive:         '#9C8F8B',
  },

  dark: {
    // ── Page backgrounds (web dark tokens) ────────────────────────────────
    background:           '#111827',
    backgroundSecondary:  '#151E2E',   // compat alias
    backgroundTertiary:   '#192436',   // compat alias
    surfaceSoft:          '#1E2637',

    // ── Surfaces ─────────────────────────────────────────────────────────
    surface:              '#1A2235',
    surfaceElevated:      '#212B40',
    surfaceMuted:         '#1E2637',
    card:                 '#1A2235',   // compat alias
    cardHighlight:        '#212B40',   // compat alias

    // ── Text ─────────────────────────────────────────────────────────────
    textPrimary:          '#F1F5F9',
    textSecondary:        '#B0BAC9',
    textMuted:            '#94A3B8',
    textTertiary:         '#94A3B8',   // compat alias
    textDisabled:         '#46536B',
    textInverse:          '#1C1414',
    text:                 '#F1F5F9',   // compat alias
    text2:                '#B0BAC9',   // compat alias

    // ── Borders ──────────────────────────────────────────────────────────
    border:               '#1E2D45',
    borderStrong:         '#2A3C5C',
    borderLight:          '#1A2740',   // compat alias → divider
    borderDark:           '#2A3C5C',   // compat alias
    borderFocus:          '#D4A44C',
    divider:              '#1A2740',

    // ── Primary (brand gold, dark variant — web --brand dark) ─────────────
    primary:              '#D4A44C',
    primaryHover:         '#E0B86D',
    primarySoft:          '#2E2617',
    primaryText:          '#1C1414',
    primarySubtle:        '#2E2617',   // compat alias

    tint:                 '#D4A44C',   // compat alias
    tintSecondary:        '#E0B86D',   // compat alias
    tintLight:            '#2E2617',   // compat alias
    tintDark:             '#B8832E',   // compat alias
    tintSubtle:           'rgba(212,164,76,0.10)',
    accent:               '#D4A44C',   // compat alias
    accentLight:          '#2E2617',   // compat alias
    accentBorder:         '#4A3D22',   // compat alias
    accentSubtle:         'rgba(212,164,76,0.08)',

    // ── Semantic states ───────────────────────────────────────────────────
    success:              '#6EAF86',
    successBg:            '#14261C',
    successLight:         '#14261C',   // compat alias
    successSurface:       '#14261C',   // compat alias
    successText:          '#8FCBA5',

    warning:              '#DBA23C',
    warningBg:            '#2C2211',
    warningLight:         '#2C2211',   // compat alias
    warningSurface:       '#2C2211',   // compat alias
    warningText:          '#E8BE6B',

    danger:               '#F87171',
    dangerBg:             '#331B1B',
    dangerSurface:        '#331B1B',   // compat alias
    dangerLight:          '#331B1B',   // compat alias
    error:                '#F87171',   // compat alias
    errorLight:           '#331B1B',   // compat alias
    errorText:            '#FCA5A5',

    // Info follows the web system: brand-gold anchored
    info:                 '#D4A44C',
    infoBg:               '#2E2617',
    infoLight:            '#2E2617',   // compat alias
    infoSurface:          '#2E2617',   // compat alias
    infoText:             '#E0B86D',

    // ── Navigation ────────────────────────────────────────────────────────
    tabBar:               '#1A2235',
    tabBarBorder:         '#1E2D45',
    tabBarActive:         '#D4A44C',
    tabBarInactive:       '#94A3B8',
    header:               '#1A2235',
    headerBorder:         '#1E2D45',
    tabIconDefault:       '#94A3B8',   // compat alias
    tabIconSelected:      '#D4A44C',   // compat alias

    // ── Shadows ───────────────────────────────────────────────────────────
    shadow:               'rgba(0,0,0,0.25)',
    shadowDark:           'rgba(0,0,0,0.45)',

    // ── Icons ─────────────────────────────────────────────────────────────
    icon:                 '#94A3B8',
    iconActive:           '#D4A44C',
    iconInactive:         '#94A3B8',
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
