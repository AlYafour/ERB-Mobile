import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';
import { AppBottomSheet } from './AppBottomSheet';

type Palette = typeof Colors.light | typeof Colors.dark;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

interface Props {
  label?: string;
  value: string;        // YYYY-MM-DD
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

function toYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatDisplay(str: string): string {
  if (!str) return '';
  const d = toDate(str);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function buildYearRange(min?: Date, max?: Date): number[] {
  const now = new Date();
  const start = min ? min.getFullYear() : now.getFullYear() - 5;
  const end = max ? max.getFullYear() : now.getFullYear() + 10;
  const arr: number[] = [];
  for (let y = start; y <= end; y++) arr.push(y);
  return arr;
}

export default function DatePickerInput({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
}: Props) {
  const C = Colors[useColorScheme() ?? 'light'];
  const S = useMemo(() => makeStyles(C), [C]);
  const initDate = toDate(value);
  const [show, setShow] = useState(false);
  const [selYear, setSelYear] = useState(initDate.getFullYear());
  const [selMonth, setSelMonth] = useState(initDate.getMonth() + 1); // 1-12
  const [selDay, setSelDay] = useState(initDate.getDate());

  const years = useMemo(() => buildYearRange(minimumDate, maximumDate), [minimumDate, maximumDate]);
  const totalDays = daysInMonth(selYear, selMonth);

  const handleOpen = () => {
    const d = value ? toDate(value) : new Date();
    setSelYear(d.getFullYear());
    setSelMonth(d.getMonth() + 1);
    setSelDay(Math.min(d.getDate(), daysInMonth(d.getFullYear(), d.getMonth() + 1)));
    setShow(true);
  };

  const handleConfirm = () => {
    const safeDay = Math.min(selDay, daysInMonth(selYear, selMonth));
    onChange(toYMD(selYear, selMonth, safeDay));
    setShow(false);
  };

  const handleMonthChange = (m: number) => {
    setSelMonth(m);
    const maxDay = daysInMonth(selYear, m);
    if (selDay > maxDay) setSelDay(maxDay);
  };

  const handleYearChange = (y: number) => {
    setSelYear(y);
    const maxDay = daysInMonth(y, selMonth);
    if (selDay > maxDay) setSelDay(maxDay);
  };

  // prev / next month navigation
  const prevMonth = () => {
    if (selMonth === 1) { handleYearChange(selYear - 1); setSelMonth(12); }
    else handleMonthChange(selMonth - 1);
  };
  const nextMonth = () => {
    if (selMonth === 12) { handleYearChange(selYear + 1); setSelMonth(1); }
    else handleMonthChange(selMonth + 1);
  };

  // calendar grid
  const firstWeekday = new Date(selYear, selMonth - 1, 1).getDay(); // 0=Sun
  const gridCells = firstWeekday + totalDays;
  const rows = Math.ceil(gridCells / 7);

  const isDisabled = (day: number) => {
    const d = new Date(toYMD(selYear, selMonth, day) + 'T00:00:00');
    if (minimumDate && d < minimumDate) return true;
    if (maximumDate && d > maximumDate) return true;
    return false;
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    selMonth === today.getMonth() + 1 &&
    selYear === today.getFullYear();

  return (
    <View style={S.wrapper}>
      {label && <Text style={S.label}>{label}</Text>}

      <TouchableOpacity style={[S.trigger, show && S.triggerFocused]} onPress={handleOpen} activeOpacity={0.75}>
        <IconSymbol name="calendar" size={18} color={value ? C.tint : C.textTertiary} style={{ marginRight: 8 }} />
        <Text style={[S.triggerText, !value && S.placeholder]} numberOfLines={1}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        {value ? (
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); onChange(''); }} hitSlop={10}>
            <IconSymbol name="xmark.circle.fill" size={18} color={C.textTertiary} />
          </TouchableOpacity>
        ) : (
          <IconSymbol name="chevron.down" size={20} color={C.textTertiary} />
        )}
      </TouchableOpacity>

      <AppBottomSheet visible={show} onClose={() => setShow(false)}>

        {/* Header */}
        <View style={S.sheetHeader}>
          <TouchableOpacity onPress={() => setShow(false)} style={S.hBtn}>
            <Text style={S.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
          <Text style={S.sheetTitle}>{label || 'Select Date'}</Text>
          <TouchableOpacity onPress={handleConfirm} style={S.hBtn}>
            <Text style={S.doneTxt}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Month + Year navigation */}
        <View style={S.navRow}>
          <TouchableOpacity onPress={prevMonth} style={S.navBtn} hitSlop={8}>
            <IconSymbol name="chevron.left" size={26} color={C.tint} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={S.navMonth}>{MONTHS_LONG[selMonth - 1]} {selYear}</Text>
          </View>
          <TouchableOpacity onPress={nextMonth} style={S.navBtn} hitSlop={8}>
            <IconSymbol name="chevron.right" size={26} color={C.tint} />
          </TouchableOpacity>
        </View>

        {/* Year quick-select */}
        <FlatList
          data={years}
          keyExtractor={(y) => String(y)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.yearList}
          initialScrollIndex={Math.max(0, years.indexOf(selYear))}
          getItemLayout={(_, i) => ({ length: 60, offset: 60 * i, index: i })}
          renderItem={({ item: y }) => (
            <TouchableOpacity
              onPress={() => handleYearChange(y)}
              style={[S.yearChip, y === selYear && S.yearChipActive]}>
              <Text style={[S.yearChipTxt, y === selYear && S.yearChipTxtActive]}>{y}</Text>
            </TouchableOpacity>
          )}
        />

        {/* Weekday headers */}
        <View style={S.weekRow}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <Text key={d} style={S.weekDay}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={S.grid}>
          {Array.from({ length: rows * 7 }, (_, i) => {
            const day = i - firstWeekday + 1;
            const valid = day >= 1 && day <= totalDays;
            const disabled = valid && isDisabled(day);
            const selected = valid && day === selDay;
            const todayCell = valid && isToday(day);
            return (
              <TouchableOpacity
                key={i}
                style={[S.cell, selected && S.cellSelected, todayCell && !selected && S.cellToday]}
                onPress={() => valid && !disabled && setSelDay(day)}
                disabled={!valid || disabled}
                activeOpacity={0.7}>
                {valid && (
                  <Text style={[
                    S.cellTxt,
                    disabled && S.cellTxtDisabled,
                    selected && S.cellTxtSelected,
                    todayCell && !selected && { color: C.tint, fontWeight: '700' },
                  ]}>
                    {day}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected date display */}
        <View style={S.footer}>
          <Text style={S.footerTxt}>
            {selDay} {MONTHS_LONG[selMonth - 1]} {selYear}
          </Text>
          <TouchableOpacity onPress={handleConfirm} style={S.confirmBtn} activeOpacity={0.85}>
            <Text style={S.confirmTxt}>Confirm</Text>
          </TouchableOpacity>
        </View>

      </AppBottomSheet>
    </View>
  );
}

const CELL = 44;

const makeStyles = (C: Palette) => StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 6 },

  trigger: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, minHeight: 46,
  },
  triggerFocused: { borderColor: C.tint, borderWidth: 1.5 },
  triggerText: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
  placeholder: { color: C.textTertiary, fontWeight: '400' },

  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: C.text, flex: 1, textAlign: 'center' },
  hBtn: { paddingHorizontal: 4, paddingVertical: 4, minWidth: 60 },
  cancelTxt: { fontSize: 15, color: C.textSecondary, fontWeight: '500' },
  doneTxt: { fontSize: 15, color: C.tint, fontWeight: '700', textAlign: 'right' },

  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4,
  },
  navBtn: { padding: 4 },
  navMonth: { fontSize: 17, fontWeight: '700', color: C.text },

  yearList: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  yearChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: C.cardHighlight,
    minWidth: 54, alignItems: 'center',
  },
  yearChipActive: { backgroundColor: C.tint },
  yearChipTxt: { fontSize: 14, fontWeight: '500', color: C.textSecondary },
  yearChipTxtActive: { color: '#FFFFFF', fontWeight: '700' },

  weekRow: {
    flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 4,
  },
  weekDay: {
    width: CELL, textAlign: 'center',
    fontSize: 12, fontWeight: '600', color: C.textTertiary,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  cell: {
    width: CELL, height: CELL,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: CELL / 2,
  },
  cellSelected: { backgroundColor: C.tint },
  cellToday: { borderWidth: 1.5, borderColor: C.tint },
  cellTxt: { fontSize: 15, fontWeight: '400', color: C.text },
  cellTxtSelected: { color: '#FFFFFF', fontWeight: '700' },
  cellTxtDisabled: { color: C.textTertiary },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.border, marginTop: 4,
  },
  footerTxt: { fontSize: 15, fontWeight: '600', color: C.text },
  confirmBtn: {
    backgroundColor: C.tint, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  confirmTxt: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
