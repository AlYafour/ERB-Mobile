import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  style?: any;
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return { backgroundColor: '#d4edda', color: '#155724', borderColor: '#c3e6cb' };
      case 'error':
        return { backgroundColor: '#f8d7da', color: '#721c24', borderColor: '#f5c6cb' };
      case 'warning':
        return { backgroundColor: '#fff3cd', color: '#856404', borderColor: '#ffeaa7' };
      case 'info':
        return { backgroundColor: '#d1ecf1', color: '#0c5460', borderColor: '#bee5eb' };
      default:
        return { backgroundColor: '#e9ecef', color: '#495057', borderColor: '#dee2e6' };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View style={[styles.badge, { backgroundColor: variantStyles.backgroundColor, borderColor: variantStyles.borderColor }, style]}>
      <Text style={[styles.badgeText, { color: variantStyles.color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

