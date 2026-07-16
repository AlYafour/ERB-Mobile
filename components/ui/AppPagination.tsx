import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing, Typography } from '@/constants/spacing';
import { AppButton } from '@/components/ui/AppButton';

interface AppPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** Disables both buttons while a page is loading — they never unmount. */
  loading?: boolean;
}

/**
 * List pagination footer. The buttons are ALWAYS rendered (disabled while
 * loading) — replacing the whole list with a spinner used to make the
 * buttons vanish under the user's finger mid-tap.
 */
export function AppPagination({
  page,
  pageSize,
  totalCount,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  loading = false,
}: AppPaginationProps) {
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <View style={[s.row, { backgroundColor: C.surfaceSoft, borderTopColor: C.border }]}>
      <AppButton
        title="Previous"
        variant="secondary"
        size="sm"
        onPress={onPrevious}
        disabled={loading || !hasPrevious || page === 1}
        style={s.btn}
      />
      <Text
        style={[s.rangeText, { color: C.textMuted }]}
        accessibilityLabel={`Showing ${from} to ${to} of ${totalCount}`}
      >
        {from}–{to} of {totalCount}
      </Text>
      <AppButton
        title="Next"
        variant="secondary"
        size="sm"
        onPress={onNext}
        disabled={loading || !hasNext}
        style={s.btn}
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: { minWidth: 88 },
  rangeText: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
});
