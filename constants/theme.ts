import { Platform } from 'react-native';

/**
 * Al Yafour ERP — Design System v2
 * Single source of truth for all colors.
 */
export const Colors = {
  light: {
    // ── Page backgrounds ──────────────────────────────────────────────────
    background:           '#F4F6F8',
    backgroundSecondary:  '#EEF1F5',   // compat alias
    backgroundTertiary:   '#E8ECF2',   // compat alias
    surfaceSoft:          '#F8FAFC',

    // ── Surfaces (cards, panels) ─────────────────────────────────────────
    surface:              '#FFFFFF',
    surfaceElevated:      '#FFFFFF',
    surfaceMuted:         '#F8FAFC',   // icon tiles, section bg
    card:                 '#FFFFFF',   // compat alias
    cardHighlight:        '#F8FAFC',   // compat alias

    // ── Text ─────────────────────────────────────────────────────────────
    textPrimary:          '#0B1220',
    textSecondary:        '#526173',
    textMuted:            '#8A97A8',
    textTertiary:         '#8A97A8',   // compat alias
    textDisabled:         '#C2CAD4',
    textInverse:          '#FFFFFF',
    text:                 '#0B1220',   // compat alias
    text2:                '#526173',   // compat alias

    // ── Borders ──────────────────────────────────────────────────────────
    border:               '#E3E8EF',
    borderStrong:         '#C8D0DC',
    borderLight:          '#EDF1F5',   // compat alias → divider
    borderDark:           '#C8D0DC',   // compat alias
    borderFocus:          '#0B1F33',
    divider:              '#EDF1F5',

    // ── Primary (navy) ────────────────────────────────────────────────────
    primary:              '#0B1F33',
    primaryHover:         '#162D47',
    primarySoft:          '#EAF0F6',
    primaryText:          '#FFFFFF',
    primarySubtle:        '#EAF0F6',   // compat alias

    // ── No orange as primary — tint maps to primary ───────────────────────
    tint:                 '#0B1F33',   // compat alias → navy (NOT orange)
    tintSecondary:        '#162D47',   // compat alias
    tintLight:            '#EAF0F6',   // compat alias
    tintDark:             '#050F1A',   // compat alias
    tintSubtle:           'rgba(11,31,51,0.07)',  // compat alias
    accent:               '#0B1F33',   // compat alias (was orange — removed)
    accentLight:          '#EAF0F6',   // compat alias
    accentBorder:         '#C0CDD8',   // compat alias
    accentSubtle:         'rgba(11,31,51,0.06)',  // compat alias

    // ── Semantic states ───────────────────────────────────────────────────
    success:              '#167A3F',
    successBg:            '#EAF7EF',
    successLight:         '#EAF7EF',   // compat alias
    successSurface:       '#EAF7EF',   // compat alias
    successText:          '#0E5229',

    warning:              '#946200',
    warningBg:            '#FFF7D6',
    warningLight:         '#FFF7D6',   // compat alias
    warningSurface:       '#FFF7D6',   // compat alias
    warningText:          '#6B4700',

    danger:               '#B42318',
    dangerBg:             '#FDECEC',
    dangerSurface:        '#FDECEC',   // compat alias
    dangerLight:          '#FDECEC',   // compat alias
    error:                '#B42318',   // compat alias
    errorLight:           '#FDECEC',   // compat alias
    errorText:            '#7A1512',

    info:                 '#2563EB',
    infoBg:               '#EEF4FF',
    infoLight:            '#EEF4FF',   // compat alias
    infoSurface:          '#EEF4FF',   // compat alias
    infoText:             '#1A44A8',

    // ── Navigation ────────────────────────────────────────────────────────
    tabBar:               '#FFFFFF',
    tabBarBorder:         '#E3E8EF',
    tabBarActive:         '#0B1F33',
    tabBarInactive:       '#8A97A8',
    header:               '#FFFFFF',
    headerBorder:         '#E3E8EF',
    tabIconDefault:       '#8A97A8',   // compat alias
    tabIconSelected:      '#0B1F33',   // compat alias

    // ── Shadows ───────────────────────────────────────────────────────────
    shadow:               'rgba(11,31,51,0.08)',
    shadowDark:           'rgba(11,31,51,0.14)',

    // ── Icons ─────────────────────────────────────────────────────────────
    icon:                 '#8A97A8',
    iconActive:           '#0B1F33',
    iconInactive:         '#8A97A8',
  },

  dark: {
    // ── Page backgrounds ──────────────────────────────────────────────────
    background:           '#07111F',
    backgroundSecondary:  '#0B1929',   // compat alias
    backgroundTertiary:   '#0F2034',   // compat alias
    surfaceSoft:          '#122235',

    // ── Surfaces ─────────────────────────────────────────────────────────
    surface:              '#0D1B2A',
    surfaceElevated:      '#15263A',
    surfaceMuted:         '#122235',
    card:                 '#0D1B2A',   // compat alias
    cardHighlight:        '#15263A',   // compat alias

    // ── Text ─────────────────────────────────────────────────────────────
    textPrimary:          '#F8FAFC',
    textSecondary:        '#CBD5E1',
    textMuted:            '#94A3B8',
    textTertiary:         '#94A3B8',   // compat alias
    textDisabled:         '#3D526A',
    textInverse:          '#0B1F33',
    text:                 '#F8FAFC',   // compat alias
    text2:                '#CBD5E1',   // compat alias

    // ── Borders ──────────────────────────────────────────────────────────
    border:               '#223247',
    borderStrong:         '#2E4260',
    borderLight:          '#1A2A3D',   // compat alias → divider
    borderDark:           '#2E4260',   // compat alias
    borderFocus:          '#F8FAFC',
    divider:              '#1A2A3D',

    // ── Primary (white in dark) ───────────────────────────────────────────
    primary:              '#FFFFFF',
    primaryHover:         '#E2E8F0',
    primarySoft:          '#1E334A',
    primaryText:          '#0B1F33',
    primarySubtle:        '#1E334A',   // compat alias

    tint:                 '#FFFFFF',   // compat alias
    tintSecondary:        '#E2E8F0',   // compat alias
    tintLight:            '#1E334A',   // compat alias
    tintDark:             '#CBD5E1',   // compat alias
    tintSubtle:           'rgba(255,255,255,0.07)',
    accent:               '#FFFFFF',   // compat alias
    accentLight:          '#1E334A',   // compat alias
    accentBorder:         '#2E4260',   // compat alias
    accentSubtle:         'rgba(255,255,255,0.06)',

    // ── Semantic states ───────────────────────────────────────────────────
    success:              '#4ADE80',
    successBg:            '#0E2A1A',
    successLight:         '#0E2A1A',   // compat alias
    successSurface:       '#0E2A1A',   // compat alias
    successText:          '#4ADE80',

    warning:              '#FACC15',
    warningBg:            '#332A0A',
    warningLight:         '#332A0A',   // compat alias
    warningSurface:       '#332A0A',   // compat alias
    warningText:          '#FACC15',

    danger:               '#F87171',
    dangerBg:             '#351515',
    dangerSurface:        '#351515',   // compat alias
    dangerLight:          '#351515',   // compat alias
    error:                '#F87171',   // compat alias
    errorLight:           '#351515',   // compat alias
    errorText:            '#F87171',

    info:                 '#60A5FA',
    infoBg:               '#102A4A',
    infoLight:            '#102A4A',   // compat alias
    infoSurface:          '#102A4A',   // compat alias
    infoText:             '#60A5FA',

    // ── Navigation ────────────────────────────────────────────────────────
    tabBar:               '#0D1B2A',
    tabBarBorder:         '#223247',
    tabBarActive:         '#FFFFFF',
    tabBarInactive:       '#94A3B8',
    header:               '#0D1B2A',
    headerBorder:         '#223247',
    tabIconDefault:       '#94A3B8',   // compat alias
    tabIconSelected:      '#FFFFFF',   // compat alias

    // ── Shadows ───────────────────────────────────────────────────────────
    shadow:               'rgba(0,0,0,0.25)',
    shadowDark:           'rgba(0,0,0,0.45)',

    // ── Icons ─────────────────────────────────────────────────────────────
    icon:                 '#94A3B8',
    iconActive:           '#FFFFFF',
    iconInactive:         '#94A3B8',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof Colors.light;

export const Fonts = Platform.select({
  ios:     { sans: 'system-ui', mono: 'ui-monospace' },
  default: { sans: 'normal', mono: 'monospace' },
  web:     { sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", mono: 'monospace' },
});
