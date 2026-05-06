import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from './icon-symbol';
import { Colors } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: { icon: string; onPress: () => void; label?: string };
  rightElement?: React.ReactNode;
}

const C = Colors.light;

export function ScreenHeader({ title, subtitle, showBack = false, rightAction, rightElement }: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>

        {/* Left: back button or spacer */}
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={16} activeOpacity={0.7}>
            <View style={styles.backCircle}>
              <IconSymbol name="chevron.left" size={18} color={C.tint} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.sideSlot} />
        )}

        {/* Center: title + subtitle */}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        {/* Right: custom element, action button, or spacer */}
        {rightElement ? (
          <View style={styles.sideSlot}>{rightElement}</View>
        ) : rightAction ? (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.actionBtn} hitSlop={8} activeOpacity={0.8}>
            <IconSymbol name={rightAction.icon as any} size={18} color="#FFFFFF" />
            {rightAction.label ? <Text style={styles.actionLabel}>{rightAction.label}</Text> : null}
          </TouchableOpacity>
        ) : (
          <View style={styles.sideSlot} />
        )}

      </View>

      {/* Accent line */}
      <View style={styles.accentLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 0,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    marginTop: 2,
    letterSpacing: 0,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accentLine: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F97316',
    marginHorizontal: -16,
  },
});
