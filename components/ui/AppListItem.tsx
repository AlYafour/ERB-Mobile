import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BorderRadius, Spacing, TouchTarget } from '@/constants/spacing';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface AppListItemProps {
  title: string;
  subtitle?: string;
  /** SF-symbol name rendered in a tinted leading tile. */
  icon?: string;
  iconColor?: string;
  iconBg?: string;
  /** Trailing accessory (badge, count, switch…). */
  right?: ReactNode;
  /** Show a trailing chevron (default true when onPress is set). */
  chevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/**
 * Standard tappable list row: leading icon tile, title/subtitle, trailing
 * accessory + chevron. Guarantees the 44pt minimum touch target.
 */
export function AppListItem({
  title,
  subtitle,
  icon,
  iconColor,
  iconBg,
  right,
  chevron,
  onPress,
  disabled = false,
  accessibilityLabel,
}: AppListItemProps) {
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const showChevron = chevron ?? !!onPress;

  const content = (
    <>
      {icon ? (
        <View style={[s.iconTile, { backgroundColor: iconBg ?? C.primarySoft }]}>
          <IconSymbol name={icon as any} size={18} color={iconColor ?? C.primary} />
        </View>
      ) : null}
      <View style={s.textCol}>
        <Text style={[s.title, { color: C.textPrimary }]} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={[s.subtitle, { color: C.textSecondary }]} numberOfLines={2}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
      {showChevron ? (
        <IconSymbol name="chevron.right" size={16} color={C.textMuted} style={s.chevron} />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}>
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[s.row, { backgroundColor: C.surface, borderColor: C.border }, disabled && s.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      hitSlop={TouchTarget.hitSlop}
    >
      {content}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: TouchTarget.minHeight + 12,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  subtitle: { fontSize: 12, lineHeight: 17 },
  chevron: { marginStart: 2, transform: [{ scaleX: 1 }] },
  disabled: { opacity: 0.5 },
});
