import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** When true (and secureTextEntry is used), renders a built-in eye/eye-slash
   *  toggle as the rightIcon, managing its own show/hide state. Ignored if an
   *  explicit rightIcon is also passed. */
  secureToggle?: boolean;
}

export function Input({
  label,
  error,
  hint,
  containerStyle,
  style,
  leftIcon,
  rightIcon,
  secureToggle = false,
  secureTextEntry,
  ...props
}: InputProps) {
  const cs = useColorScheme() ?? 'light';
  const colors = Colors[cs];
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(false);

  const isSecureToggle = secureToggle && secureTextEntry !== undefined && !rightIcon;
  const effectiveSecureTextEntry = isSecureToggle ? !secureVisible : secureTextEntry;
  const effectiveRightIcon =
    rightIcon ??
    (isSecureToggle ? (
      <TouchableOpacity
        onPress={() => setSecureVisible(v => !v)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={secureVisible ? 'Hide password' : 'Show password'}
      >
        <IconSymbol name={secureVisible ? 'eye.slash.fill' : 'eye.fill'} size={19} color="#64748B" />
      </TouchableOpacity>
    ) : null);

  const borderColor = error
    ? colors.error
    : focused
    ? colors.borderFocus          // navy focus — NOT orange
    : colors.border;

  const borderWidth = focused ? 1.5 : 1;

  return (
    <View style={[s.container, containerStyle]}>
      {label ? (
        <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}

      <View
        style={[
          s.inputWrap,
          {
            borderColor,
            borderWidth,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {leftIcon ? <View style={s.leftSlot}>{leftIcon}</View> : null}
        <TextInput
          style={[
            s.input,
            {
              color: colors.textPrimary,
              paddingLeft: leftIcon ? 44 : 14,
              paddingRight: effectiveRightIcon ? 44 : 14,
            },
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={effectiveSecureTextEntry}
          {...props}
        />
        {effectiveRightIcon ? <View style={s.rightSlot}>{effectiveRightIcon}</View> : null}
      </View>

      {error ? (
        <Text style={[s.errorText, { color: colors.error }]}>{error}</Text>
      ) : hint ? (
        <Text style={[s.hint, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, letterSpacing: 0.1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    minHeight: 48,
    position: 'relative',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  leftSlot: { position: 'absolute', left: 13, zIndex: 1 },
  rightSlot: { position: 'absolute', right: 13, zIndex: 1 },
  errorText: { fontSize: 12, marginTop: 4, fontWeight: '400' },
  hint: { fontSize: 12, marginTop: 4 },
});
