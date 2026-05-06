import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Modal, StyleSheet as RNStyleSheet,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';

const C = Colors.light;

interface DatePickerInputProps {
  label?: string;
  value: string;           // YYYY-MM-DD
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

  const handleOpen = () => {
    setTempDate(toDate(value));
    setShow(true);
  };

  const handleAndroidChange = (_e: DateTimePickerEvent, selected?: Date) => {
    setShow(false);
    if (selected && _e.type !== 'dismissed') {
      onChange(toYMD(selected));
    }
  };

  const handleIOSChange = (_e: DateTimePickerEvent, selected?: Date) => {
    if (selected) setTempDate(selected);
  };

  const handleIOSConfirm = () => {
    onChange(toYMD(tempDate));
    setShow(false);
  };

  const handleIOSCancel = () => {
    setTempDate(toDate(value));
    setShow(false);
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}

      <TouchableOpacity
        style={[styles.input, show && styles.inputFocused]}
        onPress={handleOpen}
        activeOpacity={0.75}>
        <MaterialIcons
          name="calendar-today"
          size={18}
          color={value ? C.tint : C.textTertiary}
          style={{ marginRight: 8 }}
        />
        <Text style={[styles.inputText, !value && styles.placeholder]} numberOfLines={1}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        {value ? (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onChange(''); }}
            hitSlop={10}
            style={styles.clearBtn}>
            <MaterialIcons name="cancel" size={18} color={C.textTertiary} />
          </TouchableOpacity>
        ) : (
          <MaterialIcons name="expand-more" size={20} color={C.textTertiary} />
        )}
      </TouchableOpacity>

      {/* Android: native dialog (no custom modal needed) */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {/* iOS: bottom sheet modal */}
      {Platform.OS === 'ios' && (
        <Modal
          transparent
          visible={show}
          animationType="slide"
          onRequestClose={handleIOSCancel}>

          {/* Full-screen container: backdrop fills top, sheet anchored at bottom */}
          <View style={styles.modalOverlay}>
            {/* Dimmed background — tap to cancel */}
            <TouchableOpacity
              style={RNStyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={handleIOSCancel}
            />

            {/* Bottom sheet */}
            <View style={styles.sheet}>
              {/* Header bar */}
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={handleIOSCancel} style={styles.sheetBtn} hitSlop={8}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {label || 'Select Date'}
                </Text>

                <TouchableOpacity onPress={handleIOSConfirm} style={styles.sheetBtn} hitSlop={8}>
                  <Text style={styles.confirmText}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Date spinner */}
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleIOSChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={styles.picker}
                locale="en-AE"
                textColor="#0F172A"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
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
    paddingVertical: 11,
    minHeight: 46,
  },
  inputFocused: {
    borderColor: C.tint,
    borderWidth: 1.5,
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
  clearBtn: {
    padding: 2,
    marginLeft: 4,
  },

  // iOS modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',   // sheet sticks to bottom
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 24 : 0,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  sheetBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  cancelText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  confirmText: {
    fontSize: 15,
    color: '#F97316',
    fontWeight: '700',
    textAlign: 'right',
  },
  picker: {
    height: 200,
    width: '100%',
  },
});
