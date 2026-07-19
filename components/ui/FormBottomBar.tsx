import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppButton } from './AppButton';

interface FormBottomBarProps {
  cancelLabel?: string;
  onCancel: () => void;
  /** Defaults to `loading` — pass explicitly to disable Cancel independently. */
  cancelDisabled?: boolean;
  submitLabel: string;
  onSubmit: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * FormBottomBar — fixed Cancel + Submit action bar for create/edit screens.
 * Generalizes the bottomBar/barBtn pattern hand-rolled in every form screen.
 */
export function FormBottomBar({
  cancelLabel = 'Cancel',
  onCancel,
  cancelDisabled,
  submitLabel,
  onSubmit,
  loading = false,
  style,
}: FormBottomBarProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        s.bottomBar,
        {
          borderTopColor: c.border,
          backgroundColor: c.surface,
          paddingBottom: Math.max(insets.bottom, 16),
        },
        style,
      ]}
    >
      <AppButton
        title={cancelLabel}
        variant="outline"
        size="md"
        onPress={onCancel}
        disabled={cancelDisabled ?? loading}
        style={s.barBtn}
      />
      <AppButton
        title={submitLabel}
        variant="primary"
        size="md"
        onPress={onSubmit}
        loading={loading}
        disabled={loading}
        style={s.barBtn}
      />
    </View>
  );
}

const s = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barBtn: { flex: 1 },
});
