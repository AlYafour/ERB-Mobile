import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { Input } from './Input';
import FilterPanel, { FilterField } from './FilterPanel';
import { IconSymbol } from './icon-symbol';

interface ListSearchBarProps {
  searchValue: string;
  onSearchChange: (text: string) => void;
  searchPlaceholder?: string;
  filterFields: FilterField[];
  filters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  onFilterReset: () => void;
  filterSaveKey?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * ListSearchBar — search input + filter-toggle button row used atop list screens.
 * Generalizes the searchContainer/searchRow/searchInputWrapper/filterBtnWrapper
 * structure previously copy-pasted across every list screen.
 */
export function ListSearchBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterFields,
  filters,
  onFilterChange,
  onFilterReset,
  filterSaveKey,
  style,
}: ListSearchBarProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];

  return (
    <View style={[s.searchContainer, style]}>
      <View style={s.searchRow}>
        <View style={s.searchInputWrapper}>
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChangeText={onSearchChange}
            containerStyle={s.searchInput}
            leftIcon={<IconSymbol name="magnifyingglass" size={20} color={c.textMuted} />}
          />
        </View>
        <View style={s.filterBtnWrapper}>
          <FilterPanel
            fields={filterFields}
            filters={filters}
            onFilterChange={onFilterChange}
            onReset={onFilterReset}
            saveKey={filterSaveKey}
          />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchRow:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchInputWrapper: { flex: 1 },
  searchInput:        { marginBottom: 0 },
  filterBtnWrapper:   { alignSelf: 'flex-start' },
});
