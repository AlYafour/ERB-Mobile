import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && window.document);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
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
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDisabled = disabled || loading;

  const base: ViewStyle = {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    flexDirection: 'row',
    gap: 8,
    ...(fullWidth && { width: '100%' }),
  };

  const getButtonStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: isDisabled ? colors.borderDark : colors.tint,
          ...(isWeb
            ? { boxShadow: isDisabled ? 'none' : '0px 1px 3px rgba(249,115,22,0.25)' }
            : {
                shadowColor: colors.tint,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDisabled ? 0 : 0.2,
                shadowRadius: 4,
                elevation: isDisabled ? 0 : 2,
              }),
        };
      case 'secondary':
        return {
          ...base,
          backgroundColor: colors.backgroundSecondary,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: isDisabled ? colors.border : colors.tint,
        };
      case 'danger':
        return {
          ...base,
          backgroundColor: isDisabled ? colors.borderDark : colors.error,
        };
      case 'success':
        return {
          ...base,
          backgroundColor: isDisabled ? colors.borderDark : colors.success,
        };
      default:
        return base;
    }
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = { fontSize: 15, fontWeight: '600', letterSpacing: 0.1 };
    switch (variant) {
      case 'outline':
        return { ...base, color: isDisabled ? colors.textTertiary : colors.tint };
      case 'secondary':
        return { ...base, color: isDisabled ? colors.textTertiary : colors.text };
      default:
        return { ...base, color: '#FFFFFF' };
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}>
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? colors.tint : '#FFF'} />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
