import { Platform } from 'react-native';

// Exact match to web design system (ERB-core-Frontend)
export const Colors = {
  light: {
    // Brand
    tint: '#F97316',
    tintSecondary: '#EA580C',
    tintLight: '#FED7AA',
    tintDark: '#C2410C',
    tintSubtle: 'rgba(249,115,22,0.08)',

    // Backgrounds
    background: '#F8FAFC',
    backgroundSecondary: '#F1F5F9',
    backgroundTertiary: '#E2E8F0',

    // Surface
    card: '#FFFFFF',
    cardHighlight: '#F8FAFC',

    // Text
    text: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    textDisabled: '#CBD5E1',
    textInverse: '#FFFFFF',

    // Borders
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderDark: '#CBD5E1',
    borderFocus: '#F97316',

    // Status
    success: '#16A34A',
    successLight: '#DCFCE7',
    successText: '#15803D',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    warningText: '#92400E',
    error: '#DC2626',
    errorLight: '#FEE2E2',
    errorText: '#B91C1C',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#DBEAFE',
    infoText: '#1D4ED8',

    // Nav
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarActive: '#F97316',
    tabBarInactive: '#94A3B8',
    header: '#FFFFFF',
    headerBorder: '#E2E8F0',

    // Shadows
    shadow: 'rgba(0,0,0,0.06)',
    shadowDark: 'rgba(0,0,0,0.1)',

    // Icon
    icon: '#64748B',
    iconActive: '#F97316',
    iconInactive: '#94A3B8',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#F97316',
  },
  dark: {
    // Brand
    tint: '#FB923C',
    tintSecondary: '#F97316',
    tintLight: '#9A3412',
    tintDark: '#EA580C',
    tintSubtle: 'rgba(249,115,22,0.12)',

    // Backgrounds
    background: '#0F172A',
    backgroundSecondary: '#131C2E',
    backgroundTertiary: '#1E2D45',

    // Surface
    card: '#162032',
    cardHighlight: '#1E2D45',

    // Text
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    textDisabled: '#334155',
    textInverse: '#0F172A',

    // Borders
    border: '#1E2D45',
    borderLight: '#1A2840',
    borderDark: '#334155',
    borderFocus: '#FB923C',

    // Status
    success: '#22C55E',
    successLight: '#052E16',
    successText: '#4ADE80',
    warning: '#F59E0B',
    warningLight: '#431407',
    warningText: '#FCD34D',
    error: '#EF4444',
    errorLight: '#450A0A',
    errorText: '#FCA5A5',
    danger: '#EF4444',
    dangerLight: '#450A0A',
    info: '#3B82F6',
    infoLight: '#1E3A5F',
    infoText: '#93C5FD',

    // Nav
    tabBar: '#0F172A',
    tabBarBorder: '#1E2D45',
    tabBarActive: '#FB923C',
    tabBarInactive: '#475569',
    header: '#0F172A',
    headerBorder: '#1E2D45',

    // Shadows
    shadow: 'rgba(0,0,0,0.3)',
    shadowDark: 'rgba(0,0,0,0.5)',

    // Icon
    icon: '#94A3B8',
    iconActive: '#FB923C',
    iconInactive: '#475569',
    tabIconDefault: '#475569',
    tabIconSelected: '#FB923C',
  },
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  default: { sans: 'normal', mono: 'monospace' },
  web: { sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", mono: "monospace" },
});
