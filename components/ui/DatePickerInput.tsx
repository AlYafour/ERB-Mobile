import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { IconSymbol } from './icon-symbol';
import { Colors } from '@/constants/theme';

const C = Colors.light;

interface DatePickerInputProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

function toDate(str: string): Date {
  if (!str) return new Date();
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(str: string): string {
  if (!str) return '';
  const d = toDate(str);
  return d.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DatePickerInput({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  required,
  minimumDate,
  maximumDate,
}: DatePickerInputProps) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(toDate(value));

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selected && _event.type !== 'dismissed') {
        onChange(toYMD(selected));
      }
    } else {
      if (selected) setTempDate(selected);
    }
  };

  const handleIOSConfirm = () => {
    onChange(toYMD(tempDate));
    setShow(false);
  };

  const handleIOSCancel = () => {
    setTempDate(toDate(value));
    setShow(false);
  };

  const handleOpen = () => {
    setTempDate(toDate(value));
    setShow(true);
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={{ color: C.error }}> *</Text>}
        </Text>
      )}

      <TouchableOpacity style={[styles.input, show && { borderColor: C.tint }]} onPress={handleOpen} activeOpacity={0.75}>
        <IconSymbol name="calendar" size={17} color={value ? C.tint : C.textTertiary} style={{ marginRight: 8 }} />
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        {value ? (
          <TouchableOpacity
            onPress={() => onChange('')}
            hitSlop={8}
            style={styles.clearBtn}>
            <IconSymbol name="xmark.circle.fill" size={16} color={C.textTertiary} />
          </TouchableOpacity>
        ) : (
          <IconSymbol name="chevron.down" size={14} color={C.textTertiary} />
        )}
      </TouchableOpacity>

      {/* Android: inline picker dialog */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {/* iOS: modal with confirm/cancel */}
      {Platform.OS === 'ios' && (
        <Modal transparent visible={show} animationType="slide" onRequestClose={handleIOSCancel}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleIOSCancel} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={handleIOSCancel} style={styles.sheetBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{label || 'Select Date'}</Text>
              <TouchableOpacity onPress={handleIOSConfirm} style={styles.sheetBtn}>
                <Text style={styles.confirmText}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              style={{ width: '100%' }}
              locale="en-AE"
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textSecondary,
    marginBottom: 6,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 46,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },
  placeholder: {
    color: C.textTertiary,
    fontWeight: '400',
  },
  clearBtn: { padding: 2 },

  // iOS modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  cancelText: { fontSize: 15, color: '#64748B', fontWeight: '500' },
  confirmText: { fontSize: 15, color: '#F97316', fontWeight: '700' },
});
