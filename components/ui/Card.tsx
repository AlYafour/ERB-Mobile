import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';

const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && window.document);

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
}

export function Card({ children, style, onPress, padding = 16 }: CardProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = backgroundColor === Colors.light.background ? '#fff' : '#1e1e1e';
  const shadowColor = '#000';

  const cardStyle: ViewStyle = {
    backgroundColor: cardColor,
    borderRadius: 12,
    padding: padding || 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: backgroundColor === Colors.light.background ? Colors.light.borderLight : Colors.dark.border,
    // Use shadow props for native, boxShadow for web
    ...(isWeb
      ? {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05)',
        }
      : {
          shadowColor,
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 1,
        }),
  };

  if (onPress) {
    return (
      <TouchableOpacity style={[cardStyle, style]} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}

