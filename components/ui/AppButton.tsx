import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, StyleProp, ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'dangerOutline'
  | 'successOutline'
  | 'ghost';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /** sm:36 md:44 lg:52 */
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  size = 'md',
  fullWidth = false,
}: AppButtonProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  const isDisabled = disabled || loading;

  const h  = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
  const pH = size === 'sm' ? 14 : size === 'lg' ? 28 : 20;
  const fs = size === 'sm' ? 13 : size === 'lg' ? 16 : 15;
  const r  = size === 'sm' ? 10 : 12;

  let bg: string;
  let textColor: string;
  let borderColor: string | undefined;
  let borderWidth: number = 0;

  if (isDisabled) {
    bg = c.surfaceMuted;
    textColor = c.textMuted;
  } else {
    switch (variant) {
      case 'primary':
        bg = c.primary;
        textColor = cs === 'dark' ? c.textInverse : '#FFFFFF';
        break;
      case 'secondary':
        bg = c.surfaceMuted;
        textColor = c.textPrimary;
        borderColor = c.border;
        borderWidth = 1;
        break;
      case 'outline':
        bg = 'transparent';
        textColor = c.textPrimary;
        borderColor = c.border;
        borderWidth = 1.5;
        break;
      case 'dangerOutline':
        bg = c.dangerBg;
        textColor = c.danger;
        borderColor = c.danger;
        borderWidth = 1;
        break;
      case 'successOutline':
        bg = c.successBg;
        textColor = c.success;
        borderColor = c.success;
        borderWidth = 1;
        break;
      case 'ghost':
        bg = 'transparent';
        textColor = c.textPrimary;
        break;
      default:
        bg = c.primary;
        textColor = '#FFFFFF';
    }
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      style={[
        s.base,
        {
          height: h,
          paddingHorizontal: pH,
          borderRadius: r,
          backgroundColor: bg,
          borderWidth,
          borderColor: borderColor ?? 'transparent',
          ...(fullWidth && { width: '100%' }),
        },
        variant === 'primary' && !isDisabled && s.primaryShadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[s.label, { fontSize: fs, color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  primaryShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 3,
  },
});
