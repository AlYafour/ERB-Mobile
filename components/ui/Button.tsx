import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  size = 'md',
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDisabled = disabled || loading;

  const padV = size === 'sm' ? 9 : size === 'lg' ? 16 : 13;
  const padH = size === 'sm' ? 14 : size === 'lg' ? 28 : 20;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;
  const minH = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;

  const base: ViewStyle = {
    paddingVertical: padV,
    paddingHorizontal: padH,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: minH,
    flexDirection: 'row',
    gap: 8,
    ...(fullWidth && { width: '100%' }),
  };

  const getButtonStyle = (): ViewStyle => {
    if (isDisabled) {
      return { ...base, backgroundColor: colors.backgroundTertiary };
    }
    switch (variant) {
      case 'primary':
        return {
          ...base,
          // navy primary — NOT orange
          backgroundColor: colorScheme === 'dark' ? colors.surface : '#0D1B2A',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 3,
        };
      case 'secondary':
        return {
          ...base,
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.border,
        };
      case 'ghost':
        return { ...base, backgroundColor: 'transparent' };
      case 'danger':
        return { ...base, backgroundColor: colors.error };
      case 'success':
        return { ...base, backgroundColor: colors.success };
      default:
        return base;
    }
  };

  const getTextColor = (): string => {
    if (isDisabled) return colors.textMuted;
    switch (variant) {
      case 'primary': return '#FFFFFF';
      case 'danger':
      case 'success': return '#FFFFFF';
      case 'secondary': return colors.textPrimary;
      case 'outline':
      case 'ghost': return colors.textPrimary;
      default: return '#FFFFFF';
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.72}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#FFFFFF' : colors.textSecondary} />
      ) : (
        <Text style={[{ fontSize, fontWeight: '600', letterSpacing: 0.1, color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
