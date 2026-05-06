import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { IconSymbol } from './icon-symbol';
import { Colors } from '@/constants/theme';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  title?: string;
}

export function Checkbox({ checked, onChange, disabled = false, indeterminate = false, title }: CheckboxProps) {
  return (
    <TouchableOpacity
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

const styles = StyleSheet.create({
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
    borderColor: '#ddd',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  checkboxIndeterminate: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
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

