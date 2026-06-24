import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { height: SCREEN_H } = Dimensions.get('window');
const ANIM_DURATION = 280;

interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Fixed height fraction (0–1) or absolute px. Default: auto-height up to 90%. */
  snapHeight?: number;
  children: React.ReactNode;
  /** Prevent closing on backdrop tap */
  lockBackdrop?: boolean;
}

export function AppBottomSheet({
  visible,
  onClose,
  title,
  snapHeight,
  children,
  lockBackdrop = false,
}: AppBottomSheetProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  const insets = useSafeAreaInsets();
  const isDark = cs === 'dark';

  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_H,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const sheetH = snapHeight
    ? snapHeight <= 1
      ? SCREEN_H * snapHeight
      : snapHeight
    : undefined;

  const sheetBg = isDark ? '#1A2740' : '#FFFFFF';
  const handleBg = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(13,27,42,0.15)';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={lockBackdrop ? undefined : onClose}>
        <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kavWrapper}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            s.sheet,
            {
              backgroundColor: sheetBg,
              transform: [{ translateY }],
              paddingBottom: insets.bottom + 8,
              ...(sheetH ? { height: sheetH } : {}),
            },
          ]}
        >
          {/* Handle */}
          <View style={s.handleWrap}>
            <View style={[s.handle, { backgroundColor: handleBg }]} />
          </View>

          {/* Title */}
          {title ? (
            <View style={[s.titleRow, { borderBottomColor: c.border }]}>
              <Text style={[s.titleText, { color: c.textPrimary }]}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={12} style={s.closeBtn}>
                <View style={[s.closeBtnInner, { backgroundColor: c.surfaceMuted }]}>
                  <Text style={[s.closeX, { color: c.textSecondary }]}>✕</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}

          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface SheetActionProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  disabled?: boolean;
}

export function SheetAction({ icon, label, sublabel, onPress, disabled }: SheetActionProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];

  return (
    <TouchableOpacity
      style={[s.action, { borderBottomColor: c.border, opacity: disabled ? 0.4 : 1 }]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.65}
    >
      <View style={[s.actionIcon, { backgroundColor: c.surfaceMuted }]}>{icon}</View>
      <View style={s.actionBody}>
        <Text style={[s.actionLabel, { color: c.textPrimary }]}>{label}</Text>
        {sublabel ? (
          <Text style={[s.actionSub, { color: c.textMuted }]}>{sublabel}</Text>
        ) : null}
      </View>
      <View style={[s.actionChevron, { backgroundColor: c.surfaceMuted }]}>
        <Text style={{ color: c.textMuted, fontSize: 12 }}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  kavWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  } as any,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 20,
    minHeight: 120,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  closeBtn: { padding: 2 },
  closeBtnInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: { fontSize: 13, fontWeight: '600' },

  // SheetAction
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBody: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '500' },
  actionSub: { fontSize: 12, marginTop: 2 },
  actionChevron: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
