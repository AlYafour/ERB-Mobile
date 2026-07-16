import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, AccessibilityInfo } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BorderRadius, Spacing } from '@/constants/spacing';

interface AppSkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/** Single pulsing placeholder block. */
export function AppSkeleton({ width = '100%', height = 16, radius = BorderRadius.sm, style }: AppSkeletonProps) {
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    // Respect the OS reduce-motion setting — show a static block instead.
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (cancelled || reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.9,  duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
    });
    return () => { cancelled = true; loop?.stop(); };
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: C.surfaceMuted, opacity },
        style,
      ]}
    />
  );
}

/** Card-shaped skeleton matching AppCard proportions — use for list loading. */
export function AppSkeletonCard({ lines = 3, style }: { lines?: number; style?: ViewStyle }) {
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  return (
    <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }, style]}>
      <View style={s.cardTopRow}>
        <AppSkeleton width="45%" height={14} />
        <AppSkeleton width={64} height={20} radius={BorderRadius.full} />
      </View>
      {Array.from({ length: lines }).map((_, i) => (
        <AppSkeleton key={i} width={i === lines - 1 ? '55%' : '85%'} height={12} style={{ marginTop: Spacing.sm }} />
      ))}
    </View>
  );
}

/** Full-screen list placeholder: N skeleton cards. */
export function AppSkeletonList({ count = 4, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <View style={s.list} accessibilityLabel="Loading content" accessibilityRole="progressbar">
      {Array.from({ length: count }).map((_, i) => (
        <AppSkeletonCard key={i} lines={lines} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  list: {
    padding: 16,
    gap: Spacing.md,
  },
});
