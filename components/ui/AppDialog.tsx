import React, { ReactNode } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BorderRadius, Shadows, Spacing } from '@/constants/spacing';
import { AppButton } from '@/components/ui/AppButton';

export interface AppDialogAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'dangerOutline' | 'successOutline';
  loading?: boolean;
  disabled?: boolean;
}

interface AppDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  actions: AppDialogAction[];
  /** Tapping the backdrop dismisses; ignored while any action is loading. */
  onClose: () => void;
}

/**
 * Generic modal dialog for custom content — complements the global
 * ConfirmDialog (which is confirm/cancel only, driven via use-toast).
 */
export function AppDialog({ visible, title, message, children, actions, onClose }: AppDialogProps) {
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const busy = actions.some(a => a.loading);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
      <Pressable style={s.backdrop} onPress={() => { if (!busy) onClose(); }} accessibilityRole="none">
        <Pressable style={[s.card, { backgroundColor: C.surfaceElevated, shadowColor: C.shadowDark }]} onPress={() => {}}>
          <Text style={[s.title, { color: C.textPrimary }]} accessibilityRole="header">{title}</Text>
          {message ? <Text style={[s.message, { color: C.textSecondary }]}>{message}</Text> : null}
          {children}
          <View style={s.actions}>
            {actions.map((a, i) => (
              <AppButton
                key={i}
                title={a.label}
                variant={a.variant ?? (i === actions.length - 1 ? 'primary' : 'outline')}
                size="md"
                onPress={a.onPress}
                loading={a.loading}
                disabled={a.disabled || (busy && !a.loading)}
                style={s.actionBtn}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    ...Shadows.lg,
  },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  message: { fontSize: 14, lineHeight: 20, marginBottom: Spacing.md },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionBtn: { flex: 1 },
});
