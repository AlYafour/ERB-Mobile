import React, { useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { IconSymbol } from './icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Palette = typeof Colors.light | typeof Colors.dark;

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  title?: string;
}

export function Checkbox({ checked, onChange, disabled = false, indeterminate = false, title }: CheckboxProps) {
  const C = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked: indeterminate ? 'mixed' : checked, disabled }}
      accessibilityLabel={title}
      style={[styles.container, disabled && styles.disabled]}
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked, indeterminate && styles.checkboxIndeterminate]}>
        {checked && !indeterminate && (
          <IconSymbol name="checkmark" size={16} color="#fff" />
        )}
        {indeterminate && (
          <View style={styles.indeterminateLine} />
        )}
      </View>
      {title && <View style={styles.titleContainer} />}
    </TouchableOpacity>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: C.tint,
    borderColor: C.tint,
  },
  checkboxIndeterminate: {
    backgroundColor: C.tint,
    borderColor: C.tint,
  },
  indeterminateLine: {
    width: 10,
    height: 2,
    backgroundColor: '#fff',
  },
  titleContainer: {
    // For future title support
  },
});

