import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './icon-symbol';
import { AppButton as Button } from './AppButton';
import { AppBottomSheet } from './AppBottomSheet';
import SearchableDropdown from './SearchableDropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilterField, isActiveFilterValue } from './filter-types';

export type { FilterField };

interface SavedFilterSet {
  id: string;
  name: string;
  filters: Record<string, any>;
}

interface FilterPanelProps {
  fields: FilterField[];
  filters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  onReset: () => void;
  saveKey?: string;
}

function generateFilterSetId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function FilterPanel({ fields, filters, onFilterChange, onReset, saveKey }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(filters);
  const [savedFilterSets, setSavedFilterSets] = useState<SavedFilterSet[]>([]);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const loadSavedFilters = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(`filter_sets_${saveKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Older saved sets may predate the id field — backfill locally so
        // deleting one no longer deletes every set sharing its name.
        const withIds: SavedFilterSet[] = Array.isArray(parsed)
          ? parsed.map((s: any) => (s && s.id ? s : { ...s, id: generateFilterSetId() }))
          : [];
        setSavedFilterSets(withIds);
      }
    } catch {
      setSavedFilterSets([]);
    }
  }, [saveKey]);

  useEffect(() => {
    if (saveKey) {
      loadSavedFilters();
    }
  }, [saveKey, loadSavedFilters]);

  const handleFieldChange = (name: string, value: any) => {
    const newFilters = { ...localFilters };
    if (value === '' || value === null || value === undefined) {
      delete newFilters[name];
    } else {
      newFilters[name] = value;
    }
    setLocalFilters(newFilters);
  };

  const handleApply = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalFilters({});
    onReset();
  };

  const handleSaveFilters = () => {
    if (!saveKey) return;
    setSaveNameInput('');
    setSaveModalVisible(true);
  };

  const handleConfirmSaveFilters = async () => {
    const name = saveNameInput.trim();
    if (!name || !saveKey) return;

    try {
      const newSet: SavedFilterSet = { id: generateFilterSetId(), name, filters: localFilters };
      const sets = [...savedFilterSets, newSet];
      await AsyncStorage.setItem(`filter_sets_${saveKey}`, JSON.stringify(sets));
      setSavedFilterSets(sets);
      setSaveModalVisible(false);
    } catch (e) {
      console.error('Error saving filter set:', e);
    }
  };

  const handleLoadFilters = (filterSet: SavedFilterSet) => {
    setLocalFilters(filterSet.filters);
    onFilterChange(filterSet.filters);
    setIsOpen(false);
  };

  const handleDeleteSavedFilter = async (id: string) => {
    if (!saveKey) return;
    try {
      const sets = savedFilterSets.filter((s) => s.id !== id);
      await AsyncStorage.setItem(`filter_sets_${saveKey}`, JSON.stringify(sets));
      setSavedFilterSets(sets);
    } catch (e) {
      console.error('Error deleting filter set:', e);
    }
  };

  const activeFiltersCount = Object.keys(filters).filter((key) => isActiveFilterValue(filters[key])).length;

  const groupedFields = fields.reduce((acc, field) => {
    const group = field.group || 'General';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {} as Record<string, FilterField[]>);

  const groups = Object.keys(groupedFields);

  return (
    <>
      <TouchableOpacity
        style={[styles.filterButton, { backgroundColor, borderColor }]}
        onPress={() => setIsOpen(true)}>
        <IconSymbol name="slider.horizontal.3" size={18} color={textColor} />
        <Text style={[styles.filterButtonText, { color: textColor }]}>Filters</Text>
        {activeFiltersCount > 0 && (
          <View style={[styles.badge, { backgroundColor: C.tint }]}>
            <Text style={styles.badgeText}>{activeFiltersCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <AppBottomSheet visible={isOpen} onClose={() => setIsOpen(false)} title="Advanced Filters" snapHeight={0.9}>
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
          {saveKey && savedFilterSets.length > 0 && (
            <View style={[styles.savedFiltersSection, { borderBottomColor: borderColor }]}>
              <Text style={[styles.sectionLabel, { color: textColor }]}>Saved Filters</Text>
              <View style={styles.savedFiltersList}>
                {savedFilterSets.map((filterSet) => (
                  <View key={filterSet.id} style={styles.savedFilterItem}>
                    <TouchableOpacity
                      style={[styles.savedFilterButton, { backgroundColor, borderColor }]}
                      onPress={() => handleLoadFilters(filterSet)}>
                      <Text style={[styles.savedFilterText, { color: textColor }]}>{filterSet.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteSavedFilter(filterSet.id)}
                      style={styles.deleteButton}>
                      <IconSymbol name="trash" size={14} color={C.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {groups.map((groupName) => (
            <View key={groupName} style={styles.groupSection}>
              <Text style={[styles.groupLabel, { color: textColor }]}>{groupName}</Text>
              {groupedFields[groupName].map((field) => (
                <View key={field.name} style={styles.fieldContainer}>
                  <Text style={[styles.fieldLabel, { color: textColor }]}>{field.label}</Text>
                  {field.type === 'text' && (
                    <TextInput
                      style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      placeholderTextColor={C.icon}
                      value={localFilters[field.name] || ''}
                      onChangeText={(value) => handleFieldChange(field.name, value)}
                    />
                  )}
                  {field.type === 'number' && (
                    <TextInput
                      style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      placeholderTextColor={C.icon}
                      value={localFilters[field.name] ? String(localFilters[field.name]) : ''}
                      onChangeText={(value) => handleFieldChange(field.name, value ? parseFloat(value) : '')}
                      keyboardType="numeric"
                    />
                  )}
                  {field.type === 'select' && (
                    <SearchableDropdown
                      options={[
                        { value: '', label: 'All' },
                        ...(field.options?.map((opt) => ({
                          value: opt.value,
                          label: opt.label,
                        })) || []),
                      ]}
                      value={localFilters[field.name] || ''}
                      onChange={(val) => handleFieldChange(field.name, val)}
                      placeholder={field.placeholder || `Select ${field.label.toLowerCase()}...`}
                      searchPlaceholder="Search..."
                      emptyMessage="No options found"
                    />
                  )}
                  {field.type === 'date' && (
                    <TextInput
                      style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
                      placeholder={field.placeholder || 'Select date'}
                      placeholderTextColor={C.icon}
                      value={localFilters[field.name] || ''}
                      onChangeText={(value) => handleFieldChange(field.name, value)}
                    />
                  )}
                  {field.type === 'boolean' && (
                    <SearchableDropdown
                      options={[
                        { value: '', label: 'All' },
                        { value: 'true', label: 'Yes' },
                        { value: 'false', label: 'No' },
                      ]}
                      value={localFilters[field.name] ?? ''}
                      onChange={(val) => handleFieldChange(field.name, val === '' ? '' : val === 'true')}
                      placeholder="Select..."
                      searchPlaceholder="Search..."
                      emptyMessage="No options found"
                    />
                  )}
                  {field.type === 'range' && (
                    <View style={styles.rangeContainer}>
                      <TextInput
                        style={[styles.rangeInput, { backgroundColor, color: textColor, borderColor }]}
                        placeholder="Min"
                        placeholderTextColor={C.icon}
                        value={localFilters[`${field.name}_min`] ? String(localFilters[`${field.name}_min`]) : ''}
                        onChangeText={(value) => handleFieldChange(`${field.name}_min`, value ? parseFloat(value) : '')}
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={[styles.rangeInput, { backgroundColor, color: textColor, borderColor }]}
                        placeholder="Max"
                        placeholderTextColor={C.icon}
                        value={localFilters[`${field.name}_max`] ? String(localFilters[`${field.name}_max`]) : ''}
                        onChangeText={(value) => handleFieldChange(`${field.name}_max`, value ? parseFloat(value) : '')}
                        keyboardType="numeric"
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
          {saveKey && (
            <Button
              title="Save"
              variant="secondary"
              onPress={handleSaveFilters}
              style={styles.footerButton}
            />
          )}
          <Button
            title="Reset"
            variant="secondary"
            onPress={handleReset}
            style={[styles.footerButton, { flex: 1 }]}
          />
          <Button
            title="Apply Filters"
            variant="primary"
            onPress={handleApply}
            style={[styles.footerButton, { flex: 1 }]}
          />
        </View>
      </AppBottomSheet>

      {/* Save filter set — cross-platform replacement for Alert.prompt (iOS-only / no-op on Android) */}
      <AppBottomSheet
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        title="Save Filter Set">
        <View style={styles.saveModalBody}>
          <Text style={[styles.fieldLabel, { color: textColor }]}>Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
            placeholder="Enter a name for this filter set"
            placeholderTextColor={C.icon}
            value={saveNameInput}
            onChangeText={setSaveNameInput}
            autoFocus
          />
          <View style={styles.saveModalActions}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setSaveModalVisible(false)}
              style={styles.footerButton}
            />
            <Button
              title="Save"
              variant="primary"
              onPress={handleConfirmSaveFilters}
              disabled={!saveNameInput.trim()}
              style={[styles.footerButton, { flex: 1 }]}
            />
          </View>
        </View>
      </AppBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    position: 'relative',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
  },
  savedFiltersSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    opacity: 0.7,
  },
  savedFiltersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  savedFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  savedFilterText: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 4,
  },
  groupSection: {
    marginBottom: 24,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    opacity: 0.7,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  rangeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    minWidth: 80,
  },
  saveModalBody: {
    padding: 16,
    gap: 12,
  },
  saveModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
});
