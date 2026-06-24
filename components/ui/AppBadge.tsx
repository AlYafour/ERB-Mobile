import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'default';

interface AppBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

/**
 * AppBadge — small pill badge per spec.
 * Height: ~26, pill radius, subtle background, status colors only.
 */
export function AppBadge({ children, variant = 'default', style }: AppBadgeProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];

  let bg: string;
  let color: string;

  switch (variant) {
    case 'success':
      bg = c.successBg;
      color = c.success;
      break;
    case 'danger':
      bg = c.dangerBg;
      color = c.danger;
      break;
    case 'warning':
      bg = c.warningBg;
      color = c.warning;
      break;
    case 'info':
      bg = c.infoBg;
      color = c.info;
      break;
    default:
      bg = c.surfaceSoft;
      color = c.textSecondary;
  }

  return (
    <View style={[s.badge, { backgroundColor: bg }, style]}>
      <Text style={[s.text, { color }]}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
