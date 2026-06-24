import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from './icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: { icon: string; onPress: () => void; label?: string };
  rightElement?: React.ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  rightAction,
  rightElement,
}: ScreenHeaderProps) {
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const colors = Colors[cs];

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as any);
  };

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={s.row}>

        {/* Left */}
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={s.sideBtn}
            hitSlop={12}
            activeOpacity={0.6}
          >
            <View style={[s.backCircle, { backgroundColor: colors.backgroundSecondary }]}>
              <IconSymbol name="chevron.left" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={s.sideBtn} />
        )}

        {/* Center */}
        <View style={s.titleArea}>
          <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[s.subtitle, { color: colors.textTertiary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right */}
        {rightElement ? (
          <View style={s.sideBtn}>{rightElement}</View>
        ) : rightAction ? (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={[s.actionBtn, { backgroundColor: colors.primary }]}
            hitSlop={8}
            activeOpacity={0.75}
          >
            <IconSymbol name={rightAction.icon as any} size={16} color="#FFFFFF" />
            {rightAction.label ? (
              <Text style={s.actionLabel}>{rightAction.label}</Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={s.sideBtn} />
        )}

      </View>

      {/* 1 px border — clean, no orange strip */}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    gap: 8,
  },
  sideBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
