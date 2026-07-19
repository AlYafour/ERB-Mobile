import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  StyleSheet, Platform,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';
import { AppBottomSheet } from './AppBottomSheet';

type Palette = typeof Colors.light | typeof Colors.dark;

export interface DropdownOption {
  value: string | number;
  label: string;
  searchText?: string;
}

interface Props {
  options: DropdownOption[];
  value: string | number | null | undefined;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  allowClear?: boolean;
  filterFunction?: (option: DropdownOption, query: string) => boolean;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  label,
  required = false,
  disabled = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  allowClear = false,
  filterFunction,
}: Props) {
  const C = Colors[useColorScheme() ?? 'light'];
  const S = useMemo(() => makeStyles(C), [C]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = useMemo(() => {
    if (value === null || value === undefined || value === '') return null;
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    if (filterFunction) return options.filter((opt) => filterFunction(opt, query));
    return options.filter(
      (opt) =>
        opt.label?.toLowerCase().includes(query) ||
        opt.searchText?.toLowerCase().includes(query) ||
        String(opt.value).toLowerCase().includes(query),
    );
  }, [options, searchQuery, filterFunction]);

  const handleSelect = (option: DropdownOption) => {
    onChange(option.value);
    close();
  };

  const close = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <View style={S.wrapper}>
      {label && (
        <Text style={S.label}>
          {label}
          {required && <Text style={S.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[S.trigger, isOpen && S.triggerOpen, disabled && S.triggerDisabled]}
        onPress={() => !disabled && setIsOpen(true)}
        activeOpacity={0.75}
        disabled={disabled}>
        <Text
          style={[S.triggerText, !selectedOption && S.triggerPlaceholder]}
          numberOfLines={1}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <View style={S.triggerIcons}>
          {allowClear && selectedOption && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onChange(null); }}
              hitSlop={10}
              style={S.clearBtn}>
              <IconSymbol name="xmark.circle.fill" size={17} color={C.textTertiary} />
            </TouchableOpacity>
          )}
          <IconSymbol
            name={isOpen ? 'chevron.up' : 'chevron.down'}
            size={22}
            color={isOpen ? C.tint : C.textTertiary}
          />
        </View>
      </TouchableOpacity>

      <AppBottomSheet visible={isOpen} onClose={close} title={label || 'Select Option'} snapHeight={0.78}>
        {/* Search */}
        <View style={S.searchWrap}>
          <IconSymbol name="magnifyingglass" size={20} color={C.textTertiary} style={S.searchIcon} />
          <TextInput
            style={S.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor={C.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <IconSymbol name="xmark" size={18} color={C.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Count pill */}
        {filteredOptions.length > 0 && searchQuery.length > 0 && (
          <View style={S.countWrap}>
            <Text style={S.countText}>{filteredOptions.length} result{filteredOptions.length !== 1 ? 's' : ''}</Text>
          </View>
        )}

        {/* Options list */}
        <FlatList
          data={filteredOptions}
          keyExtractor={(item) => String(item.value)}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          style={S.list}
          renderItem={({ item, index }) => {
            const selected = selectedOption?.value === item.value;
            return (
              <TouchableOpacity
                style={[
                  S.optionRow,
                  index === filteredOptions.length - 1 && S.optionRowLast,
                  selected && S.optionRowSelected,
                ]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.55}>
                <Text
                  style={[S.optionLabel, selected && S.optionLabelSelected]}
                  numberOfLines={2}>
                  {item.label}
                </Text>
                {selected && (
                  <IconSymbol name="checkmark.circle.fill" size={20} color={C.tint} />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={S.empty}>
              <IconSymbol name="magnifyingglass" size={36} color={C.textTertiary} />
              <Text style={S.emptyText}>{emptyMessage}</Text>
            </View>
          }
        />
      </AppBottomSheet>
    </View>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  wrapper: { marginBottom: 14 },

  label: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6 },
  required: { color: C.error },

  trigger: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    minHeight: 46,
  },
  triggerOpen: { borderColor: C.tint },
  triggerDisabled: { opacity: 0.45 },
  triggerText: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500', marginRight: 6 },
  triggerPlaceholder: { color: C.textTertiary, fontWeight: '400' },
  triggerIcons: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  clearBtn: { paddingHorizontal: 2 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.borderLight,
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1, fontSize: 15, color: C.text,
    padding: 0,
  },

  countWrap: { paddingHorizontal: 16, paddingBottom: 4 },
  countText: { fontSize: 12, color: C.textTertiary, fontWeight: '500' },

  list: { flex: 1 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
    backgroundColor: C.surface,
  },
  optionRowLast: { borderBottomWidth: 0 },
  optionRowSelected: { backgroundColor: C.tintSubtle },
  optionLabel: { flex: 1, fontSize: 15, color: C.text, marginRight: 10 },
  optionLabelSelected: { color: C.tint, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 14, color: C.textTertiary, fontWeight: '500', textAlign: 'center' },
});
