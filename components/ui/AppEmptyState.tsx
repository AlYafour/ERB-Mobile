import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol, IconSymbolName } from './icon-symbol';

export type EmptyVariant = 'empty' | 'error' | 'loading' | 'offline';

export interface AppEmptyStateProps {
  variant?: EmptyVariant;
  icon?: IconSymbolName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Reduce vertical padding when used inline */
  compact?: boolean;
}

const DEFAULT_ICONS: Record<EmptyVariant, IconSymbolName> = {
  empty: 'tray',
  error: 'exclamationmark.triangle.fill',
  loading: 'arrow.clockwise',
  offline: 'wifi.slash',
};

export function AppEmptyState({
  variant = 'empty',
  icon,
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: AppEmptyStateProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  const isDark = cs === 'dark';
  const py = compact ? 28 : 52;
  const iconName = icon ?? DEFAULT_ICONS[variant];

  if (variant === 'loading') {
    return (
      <View style={[s.root, { paddingVertical: py }]}>
        <ActivityIndicator size="large" color={c.textMuted} />
        <Text style={[s.title, { color: c.textSecondary, marginTop: 14 }]}>{title}</Text>
        {message ? <Text style={[s.msg, { color: c.textMuted }]}>{message}</Text> : null}
      </View>
    );
  }

  const iconColor =
    variant === 'error'   ? c.error   :
    variant === 'offline' ? c.warning :
    c.textMuted;

  const iconBg =
    variant === 'error'   ? c.dangerSurface  :
    variant === 'offline' ? c.warningSurface :
    c.surfaceMuted;

  const btnBg = isDark ? '#1E2D45' : '#0D1B2A';

  return (
    <View style={[s.root, { paddingVertical: py }]}>
      <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
        <IconSymbol name={iconName} size={28} color={iconColor} />
      </View>

      <Text style={[s.title, { color: c.textPrimary }]}>{title}</Text>

      {message ? (
        <Text style={[s.msg, { color: c.textSecondary }]}>{message}</Text>
      ) : null}

      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[s.btn, { backgroundColor: btnBg }]}
          onPress={onAction}
          activeOpacity={0.75}
        >
          <Text style={s.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  msg: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  btn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 10,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
