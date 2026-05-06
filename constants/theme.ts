/**
 * Premium Design System - Colors
 * Professional color palette with sharp and clear colors
 */

import { Platform } from 'react-native';

const tintColorLight = '#2563EB'; // Premium Blue
const tintColorDark = '#3B82F6';

export const Colors = {
  light: {
    // Primary Colors
    tint: tintColorLight, // Premium Blue #2563EB
    tintSecondary: '#1D4ED8',
    tintLight: '#3B82F6',
    tintDark: '#1E40AF',
    
    // Background Colors
    background: '#F8FAFC',
    backgroundSecondary: '#F1F5F9',
    backgroundTertiary: '#E2E8F0',
    
    // Card Colors
    card: '#FFFFFF',
    cardHighlight: '#F8FAFC',
    
    // Text Colors
    text: '#1E293B',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    textInverse: '#FFFFFF',
    
    // Border Colors
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderDark: '#CBD5E1',
    
    // Status Colors
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    
    // Chart Colors
    chartPrimary: '#2563EB',
    chartSecondary: '#8B5CF6',
    chartTertiary: '#10B981',
    chartQuaternary: '#F59E0B',
    
    // Icon Colors
    icon: '#64748B',
    iconActive: '#2563EB',
    iconInactive: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: tintColorLight,
    
    // Shadow
    shadow: 'rgba(0, 0, 0, 0.05)',
    shadowDark: 'rgba(0, 0, 0, 0.1)',
    
    // Gradient Colors
    gradientStart: '#2563EB',
    gradientEnd: '#1D4ED8',
  },
  dark: {
    // Primary Colors
    tint: tintColorDark,
    tintSecondary: '#2563EB',
    tintLight: '#60A5FA',
    tintDark: '#1E40AF',
    
    // Background Colors
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    backgroundTertiary: '#334155',
    
    // Card Colors
    card: '#1E293B',
    cardHighlight: '#334155',
    
    // Text Colors
    text: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    textInverse: '#0F172A',
    
    // Border Colors
    border: '#334155',
    borderLight: '#475569',
    borderDark: '#64748B',
    
    // Status Colors
    success: '#10B981',
    successLight: '#065F46',
    warning: '#F59E0B',
    warningLight: '#92400E',
    danger: '#EF4444',
    dangerLight: '#7F1D1D',
    error: '#EF4444',
    errorLight: '#7F1D1D',
    info: '#3B82F6',
    infoLight: '#1E40AF',
    
    // Chart Colors
    chartPrimary: '#3B82F6',
    chartSecondary: '#8B5CF6',
    chartTertiary: '#10B981',
    chartQuaternary: '#F59E0B',
    
    // Icon Colors
    icon: '#CBD5E1',
    iconActive: '#60A5FA',
    iconInactive: '#64748B',
    tabIconDefault: '#CBD5E1',
    tabIconSelected: tintColorDark,
    
    // Shadow
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowDark: 'rgba(0, 0, 0, 0.5)',
    
    // Gradient Colors
    gradientStart: '#3B82F6',
    gradientEnd: '#2563EB',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
