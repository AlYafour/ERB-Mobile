import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AppCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  noPadding?: boolean;
  shadow?: boolean;
}

/** One card style everywhere — radius 20, padding 18, hairline border, soft shadow. */
export function AppCard({
  children,
  style,
  onPress,
  noPadding = false,
  shadow = true,
}: AppCardProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];

  const baseStyle: StyleProp<ViewStyle>[] = [
    s.card,
    {
      backgroundColor: c.surface,
      borderColor: c.border,
      ...(shadow && {
        shadowColor: c.shadow,
        elevation: 2,
      }),
    },
    noPadding ? {} : s.pad,
    style ?? {},
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={baseStyle} onPress={onPress} activeOpacity={0.72}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={baseStyle}>{children}</View>;
}

interface AppCardRowProps {
  label: string;
  value?: string | null;
  valueColor?: string;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppCardRow({ label, value, valueColor, last = false, style }: AppCardRowProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  return (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider }, style]}>
      <Text style={[s.rowLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[s.rowValue, { color: valueColor ?? c.textPrimary }]}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

export function AppCardDivider({ style }: { style?: StyleProp<ViewStyle> }) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  return (
    <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.divider, marginVertical: 12 }, style]} />
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  pad: { padding: 18 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: { fontSize: 13, fontWeight: '400', flex: 1 },
  rowValue: { fontSize: 13, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
});
