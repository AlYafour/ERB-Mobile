import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './icon-symbol';
import { AppButton as Button } from './AppButton';
import SearchableDropdown, { DropdownOption } from './SearchableDropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FilterField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'boolean' | 'range';
  options?: { value: string | number; label: string }[];
  placeholder?: string;
  group?: string;
}

interface FilterPanelProps {
  fields: FilterField[];
  filters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  onReset: () => void;
  saveKey?: string;
}

export default function FilterPanel({ fields, filters, onFilterChange, onReset, saveKey }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(filters);
  const [savedFilterSets, setSavedFilterSets] = useState<Array<{ name: string; filters: Record<string, any> }>>([]);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (saveKey) {
      loadSavedFilters();
    }
  }, [saveKey]);

  const loadSavedFilters = async () => {
    try {
      const saved = await AsyncStorage.getItem(`filter_sets_${saveKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedFilterSets(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      setSavedFilterSets([]);
    }
  };

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

  const handleSaveFilters = async () => {
    if (!saveKey) return;
    
    Alert.prompt(
      'Save Filter Set',
      'Enter a name for this filter set:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (name: string | undefined) => {
            if (!name || !name.trim()) return;
            
            try {
              const saved = await AsyncStorage.getItem(`filter_sets_${saveKey}`);
              const sets = saved ? JSON.parse(saved) : [];
              const newSet = { name: name.trim(), filters: localFilters };
              sets.push(newSet);
              await AsyncStorage.setItem(`filter_sets_${saveKey}`, JSON.stringify(sets));
              setSavedFilterSets(sets);
            } catch (e) {
              console.error('Error saving filter set:', e);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleLoadFilters = (filterSet: { name: string; filters: Record<string, any> }) => {
    setLocalFilters(filterSet.filters);
    onFilterChange(filterSet.filters);
    setIsOpen(false);
  };

  const handleDeleteSavedFilter = async (name: string) => {
    if (!saveKey) return;
    try {
      const saved = await AsyncStorage.getItem(`filter_sets_${saveKey}`);
      if (!saved) return;
      
      const sets = JSON.parse(saved).filter((s: any) => s.name !== name);
      await AsyncStorage.setItem(`filter_sets_${saveKey}`, JSON.stringify(sets));
      setSavedFilterSets(sets);
    } catch (e) {
      console.error('Error deleting filter set:', e);
    }
  };

  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key];
    return value !== '' && value !== null && value !== undefined;
  }).length;

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
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFiltersCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <IconSymbol name="xmark" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
              {saveKey && savedFilterSets.length > 0 && (
                <View style={[styles.savedFiltersSection, { borderBottomColor: borderColor }]}>
                  <Text style={[styles.sectionLabel, { color: textColor }]}>Saved Filters</Text>
                  <View style={styles.savedFiltersList}>
                    {savedFilterSets.map((filterSet) => (
                      <View key={filterSet.name} style={styles.savedFilterItem}>
                        <TouchableOpacity
                          style={[styles.savedFilterButton, { backgroundColor, borderColor }]}
                          onPress={() => handleLoadFilters(filterSet)}>
                          <Text style={[styles.savedFilterText, { color: textColor }]}>{filterSet.name}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteSavedFilter(filterSet.name)}
                          style={styles.deleteButton}>
                          <IconSymbol name="trash" size={14} color="#dc3545" />
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
                          placeholderTextColor={Colors.light.icon}
                          value={localFilters[field.name] || ''}
                          onChangeText={(value) => handleFieldChange(field.name, value)}
                        />
                      )}
                      {field.type === 'number' && (
                        <TextInput
                          style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                          placeholderTextColor={Colors.light.icon}
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
                          placeholderTextColor={Colors.light.icon}
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
                            placeholderTextColor={Colors.light.icon}
                            value={localFilters[`${field.name}_min`] ? String(localFilters[`${field.name}_min`]) : ''}
                            onChangeText={(value) => handleFieldChange(`${field.name}_min`, value ? parseFloat(value) : '')}
                            keyboardType="numeric"
                          />
                          <TextInput
                            style={[styles.rangeInput, { backgroundColor, color: textColor, borderColor }]}
                            placeholder="Max"
                            placeholderTextColor={Colors.light.icon}
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
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#0D1B2A',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
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
});

