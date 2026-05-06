import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, StyleSheet, Modal } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './icon-symbol';

export interface DropdownOption {
  value: string | number;
  label: string;
  searchText?: string;
}

interface SearchableDropdownProps {
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
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const selectedOption = useMemo(() => {
    if (value === null || value === undefined || value === '') return null;
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;

    const query = searchQuery.toLowerCase().trim();
    
    if (filterFunction) {
      return options.filter((opt) => filterFunction(opt, query));
    }

    return options.filter((opt) => {
      const labelMatch = opt.label?.toLowerCase().includes(query);
      const searchTextMatch = opt.searchText?.toLowerCase().includes(query);
      const valueMatch = String(opt.value).toLowerCase().includes(query);
      return labelMatch || searchTextMatch || valueMatch;
    });
  }, [options, searchQuery, filterFunction]);

  const handleSelect = (option: DropdownOption) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
    setSearchQuery('');
  };

  const displayValue = selectedOption ? selectedOption.label : '';

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: textColor }]}>
          {label} {required && <Text style={{ color: '#dc3545' }}>*</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.input,
          {
            backgroundColor,
            borderColor: isOpen ? Colors.light.tint : borderColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}>
        <View style={styles.inputContent}>
          <Text style={[styles.inputText, { color: displayValue ? textColor : Colors.light.icon }]}>
            {displayValue || placeholder}
          </Text>
          <View style={styles.inputIcons}>
            {allowClear && selectedOption && (
              <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                <IconSymbol name="xmark.circle.fill" size={18} color={Colors.light.icon} />
              </TouchableOpacity>
            )}
            <IconSymbol name="chevron.down" size={16} color={Colors.light.icon} />
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {label || 'Select Option'}
              </Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <IconSymbol name="xmark" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { borderColor }]}>
              <IconSymbol name="magnifyingglass" size={20} color={Colors.light.icon} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder={searchPlaceholder}
                placeholderTextColor={Colors.light.icon}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedOption?.value === item.value && styles.optionItemSelected,
                    { borderColor },
                  ]}
                  onPress={() => handleSelect(item)}>
                  <Text style={[styles.optionText, { color: textColor }]}>{item.label}</Text>
                  {selectedOption?.value === item.value && (
                    <IconSymbol name="checkmark" size={20} color={Colors.light.tint} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: Colors.light.icon }]}>{emptyMessage}</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
  },
  inputIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionItemSelected: {
    backgroundColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});

