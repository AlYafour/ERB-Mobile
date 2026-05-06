import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  style?: any;
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.successLight, text: colors.successText };
      case 'error':
        return { bg: colors.errorLight, text: colors.errorText };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warningText };
      case 'info':
        return { bg: colors.infoLight, text: colors.infoText };
      default:
        return { bg: colors.backgroundTertiary, text: colors.textSecondary };
    }
  };

  const { bg, text } = getVariantColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
