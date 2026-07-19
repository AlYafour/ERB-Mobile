import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StyleProp, ViewStyle, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol, IconSymbolName } from './icon-symbol';

interface AppScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scroll?: boolean;
  scrollStyle?: StyleProp<ViewStyle>;
  /** default ['top', 'bottom'] for non-tab screens */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/**
 * AppScreen — screen wrapper with SafeAreaView + background.
 * Handles top (status bar) and bottom (nav bar) insets.
 */
export function AppScreen({
  children,
  style,
  scroll = false,
  scrollStyle,
  edges = ['top', 'bottom'],
}: AppScreenProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.background }, style]} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[s.scrollContent, scrollStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

interface AppSectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AppSectionHeader({ title, actionLabel, onAction, style }: AppSectionHeaderProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  return (
    <View style={[s.sectionHeader, style]}>
      <Text style={[s.sectionTitle, { color: c.textMuted }]}>{title.toUpperCase()}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={[s.sectionAction, { color: c.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface AppStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  iconName?: IconSymbolName;
  iconColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AppStatCard({
  label, value, sub, iconName, iconColor, onPress, style,
}: AppStatCardProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  const Wrap = onPress ? TouchableOpacity : View;
  const wrapProps = onPress ? { onPress, activeOpacity: 0.72 as number } : {};

  return (
    <Wrap
      style={[s.statCard, { backgroundColor: c.surface, borderColor: c.border }, style]}
      {...wrapProps}
    >
      {iconName ? (
        <View style={[s.statIcon, { backgroundColor: iconColor ? iconColor + '18' : c.surfaceMuted }]}>
          <IconSymbol name={iconName} size={16} color={iconColor ?? c.textMuted} />
        </View>
      ) : null}
      <Text style={[s.statValue, { color: c.textPrimary }]} numberOfLines={1}>{value}</Text>
      <Text style={[s.statLabel, { color: c.textMuted }]} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={[s.statSub, { color: c.textMuted }]} numberOfLines={1}>{sub}</Text> : null}
    </Wrap>
  );
}

interface AppListRowProps {
  label: string;
  value?: string | React.ReactNode;
  onPress?: () => void;
  first?: boolean;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppListRow({ label, value, onPress, first, last, style }: AppListRowProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  const Wrap = onPress ? TouchableOpacity : View;
  const wrapProps = onPress ? { onPress, activeOpacity: 0.65 as number } : {};

  return (
    <Wrap
      style={[
        s.listRow,
        { backgroundColor: c.surface, borderColor: c.border },
        first && s.listRowFirst,
        last && s.listRowLast,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth },
        style,
      ]}
      {...wrapProps}
    >
      <Text style={[s.listRowLabel, { color: c.textSecondary }]}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={[s.listRowValue, { color: c.textPrimary }]} numberOfLines={1}>
          {value || '—'}
        </Text>
      ) : (
        value ?? <Text style={[s.listRowValue, { color: c.textMuted }]}>—</Text>
      )}
      {onPress ? (
        <IconSymbol name="chevron.right" size={14} color={c.textMuted} style={{ marginLeft: 4 }} />
      ) : null}
    </Wrap>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1 },
  scrollContent: { flexGrow: 1 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 8,
  },
  sectionTitle:  { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  sectionAction: { fontSize: 13, fontWeight: '500' },

  statCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginBottom: 2 },
  statLabel: { fontSize: 12 },
  statSub:   { fontSize: 11, marginTop: 4 },

  listRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  listRowFirst: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  listRowLast: {
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listRowLabel: { flex: 1, fontSize: 14 },
  listRowValue: { fontSize: 14, fontWeight: '500', flexShrink: 1, maxWidth: '55%', textAlign: 'right' },
});
