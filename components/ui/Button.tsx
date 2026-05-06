import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';

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
  const colorScheme = useThemeColor({}, 'background') === Colors.light.background ? 'light' : 'dark';
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      flexDirection: 'row',
      gap: 8,
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: isDisabled ? '#D1D5DB' : Colors.light.tint, // Orange #ED7E07
          ...(isWeb
            ? {
                boxShadow: isDisabled ? 'none' : '0px 2px 4px rgba(237, 126, 7, 0.2)',
              }
            : {
                shadowColor: isDisabled ? 'transparent' : 'rgba(237, 126, 7, 0.3)',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: isDisabled ? 0 : 3,
              }),
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: isDisabled ? Colors.light.border : Colors.light.backgroundSecondary,
          borderWidth: 1,
          borderColor: isDisabled ? Colors.light.border : Colors.light.border,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: isDisabled ? Colors.light.border : Colors.light.tint, // Orange border
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: isDisabled ? Colors.light.border : Colors.light.error,
          ...(isWeb
            ? {
                boxShadow: isDisabled ? 'none' : '0px 2px 4px rgba(239, 68, 68, 0.1)',
              }
            : {
                shadowColor: isDisabled ? 'transparent' : Colors.light.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: isDisabled ? 0 : 2,
              }),
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: isDisabled ? Colors.light.border : Colors.light.success,
          ...(isWeb
            ? {
                boxShadow: isDisabled ? 'none' : '0px 2px 4px rgba(16, 185, 129, 0.2)',
              }
            : {
                shadowColor: isDisabled ? 'transparent' : Colors.light.success,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: isDisabled ? 0 : 3,
              }),
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.2,
    };

    switch (variant) {
      case 'outline':
        return {
          ...baseStyle,
          color: isDisabled ? Colors.light.textTertiary : Colors.light.tint,
        };
      case 'secondary':
        return {
          ...baseStyle,
          color: isDisabled ? Colors.light.textTertiary : Colors.light.text,
        };
      default:
        return {
          ...baseStyle,
          color: '#FFFFFF',
        };
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? Colors.light.tint : '#fff'} />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

