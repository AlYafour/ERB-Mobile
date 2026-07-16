import React from 'react';
import {
  ScrollView, TouchableOpacity, Text, View, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BorderRadius, Spacing, TouchTarget } from '@/constants/spacing';

export interface FilterChip<T extends string | number | boolean = string> {
  key: T;
  label: string;
}

interface AppFilterBarProps<T extends string | number | boolean> {
  options: FilterChip<T>[];
  value: T;
  onChange: (key: T) => void;
  /** Disables every chip and shows a trailing spinner — set while the list reloads. */
  loading?: boolean;
  /** 'chips' = pill row (status filters), 'segmented' = equal-width toggle. */
  variant?: 'chips' | 'segmented';
}

/**
 * Filter chip row / segmented toggle with correct loading behavior:
 * while `loading` the controls stay VISIBLE but disabled (no vanishing
 * buttons, no concurrent reload races) and a small spinner appears.
 */
export function AppFilterBar<T extends string | number | boolean>({
  options,
  value,
  onChange,
  loading = false,
  variant = 'chips',
}: AppFilterBarProps<T>) {
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  if (variant === 'segmented') {
    return (
      <View style={[s.segmentRow, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        {options.map(opt => {
          const selected = value === opt.key;
          return (
            <TouchableOpacity
              key={String(opt.key)}
              style={[
                s.segmentBtn,
                selected && { backgroundColor: C.primary },
                loading && s.disabled,
              ]}
              onPress={() => onChange(opt.key)}
              disabled={loading || selected}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected, disabled: loading }}
            >
              <Text style={[s.segmentText, { color: selected ? C.primaryText : C.textSecondary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {loading ? <ActivityIndicator size="small" color={C.primary} style={s.spinner} /> : null}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.chips}
      style={s.chipsScroll}
    >
      {options.map(opt => {
        const selected = value === opt.key;
        return (
          <TouchableOpacity
            key={String(opt.key)}
            style={[
              s.chip,
              {
                backgroundColor: selected ? C.primary : C.surface,
                borderColor: selected ? C.primary : C.border,
              },
              loading && s.disabled,
            ]}
            onPress={() => onChange(opt.key)}
            disabled={loading || selected}
            accessibilityRole="button"
            accessibilityLabel={`Filter: ${opt.label}`}
            accessibilityState={{ selected, disabled: loading }}
            hitSlop={TouchTarget.hitSlop}
          >
            <Text style={[s.chipText, { color: selected ? C.primaryText : C.textSecondary }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      {loading ? <ActivityIndicator size="small" color={C.primary} style={s.spinner} /> : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  chipsScroll: { maxHeight: 54, flexGrow: 0 },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
  },
  chipText: { fontSize: 12, fontWeight: '600' },

  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minHeight: 36,
  },
  segmentText: { fontSize: 13, fontWeight: '600' },

  spinner: { marginStart: Spacing.xs },
  disabled: { opacity: 0.5 },
});
