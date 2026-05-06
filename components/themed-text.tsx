import { StyleSheet, Text, type TextProps, Platform } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Typography } from '@/constants/spacing';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  // Use system fonts with better weights
  const getFontFamily = (weight: string) => {
    // For now, we use system fonts. When custom fonts are loaded, use them here
    // Example: return Typography.families.inter[weight] || 'System';
    return Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    });
  };

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: Typography.sizes.base,
    lineHeight: 24,
    fontWeight: Typography.weights.normal,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },
  defaultSemiBold: {
    fontSize: Typography.sizes.base,
    lineHeight: 24,
    fontWeight: Typography.weights.semibold,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },
  title: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    lineHeight: 36,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },
  subtitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    lineHeight: 28,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },
  link: {
    lineHeight: 24,
    fontSize: Typography.sizes.base,
    color: '#2563EB',
    fontWeight: Typography.weights.medium,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },
});
