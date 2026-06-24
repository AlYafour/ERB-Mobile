import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  /** Right side: pass a single node. Container is flex-shrink:0 and min-width:48. */
  right?: React.ReactNode;
  /** Border below header */
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * AppHeader — safe-area-aware app header.
 * Height after safe area inset: 64px.
 * Never clips right element. Never overlaps status bar (SafeAreaView on the screen handles top inset).
 */
export function AppHeader({
  title,
  subtitle,
  showBack = false,
  right,
  bordered = true,
  style,
}: AppHeaderProps) {
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as any);
  };

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: c.surface,
          borderBottomColor: bordered ? c.border : 'transparent',
          shadowColor: c.shadow,
        },
        style,
      ]}
    >
      {/* Left */}
      <View style={s.side}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={[s.backBtn, { backgroundColor: c.surfaceMuted }]}
            hitSlop={12}
            activeOpacity={0.6}
          >
            <IconSymbol name="chevron.left" size={16} color={c.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Center */}
      <View style={s.center}>
        <Text style={[s.title, { color: c.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[s.subtitle, { color: c.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right — flexible width, never clips */}
      <View style={s.sideRight}>
        {right ?? null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  side: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sideRight: {
    minWidth: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
    letterSpacing: 0.3,
  },
});
