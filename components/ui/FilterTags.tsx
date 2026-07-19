import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './icon-symbol';
import { FilterField, isActiveFilterValue } from './filter-types';

export type { FilterField };

interface FilterTagsProps {
  filters: Record<string, any>;
  fields: FilterField[];
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
}

export default function FilterTags({ filters, fields, onRemoveFilter, onClearAll }: FilterTagsProps) {
  const textColor = useThemeColor({}, 'text');
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const activeFilters = Object.entries(filters).filter(([, value]) => isActiveFilterValue(value));

  if (activeFilters.length === 0) return null;

  const getFilterLabel = (key: string, value: any): string => {
    const field = fields.find(f => f.name === key || key.startsWith(f.name));
    if (!field) return `${key}: ${value}`;

    if (key.endsWith('_min') || key.endsWith('_max')) {
      const baseName = key.replace(/_min$|_max$/, '');
      const baseField = fields.find(f => f.name === baseName);
      if (baseField) {
        const min = filters[`${baseName}_min`];
        const max = filters[`${baseName}_max`];
        if (min && max) {
          return `${baseField.label}: ${min} - ${max}`;
        } else if (min) {
          return `${baseField.label} ≥ ${min}`;
        } else if (max) {
          return `${baseField.label} ≤ ${max}`;
        }
      }
    }

    if (field.type === 'select' || field.type === 'boolean') {
      const option = field.options?.find(opt => String(opt.value) === String(value));
      if (option) {
        return `${field.label}: ${option.label}`;
      }
      if (field.type === 'boolean') {
        return `${field.label}: ${value ? 'Yes' : 'No'}`;
      }
    }

    if (field.type === 'date') {
      return `${field.label}: ${new Date(value).toLocaleDateString()}`;
    }

    return `${field.label}: ${value}`;
  };

  const processedKeys = new Set<string>();
  const tags: { key: string; label: string }[] = [];

  activeFilters.forEach(([key, value]) => {
    if (processedKeys.has(key)) return;

    if (key.endsWith('_min') || key.endsWith('_max')) {
      const baseName = key.replace(/_min$|_max$/, '');
      const min = filters[`${baseName}_min`];
      const max = filters[`${baseName}_max`];

      if (min || max) {
        processedKeys.add(`${baseName}_min`);
        processedKeys.add(`${baseName}_max`);
        tags.push({
          key: baseName,
          label: getFilterLabel(key, value),
        });
      }
    } else {
      processedKeys.add(key);
      tags.push({
        key,
        label: getFilterLabel(key, value),
      });
    }
  });

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {tags.map((tag) => (
          <View key={tag.key} style={[styles.tag, { backgroundColor: C.tintSubtle, borderColor: C.accentBorder }]}>
            <Text style={[styles.tagText, { color: C.tint }]}>{tag.label}</Text>
            <TouchableOpacity
              onPress={() => {
                const field = fields.find(f => f.name === tag.key);
                if (field?.type === 'range') {
                  onRemoveFilter(`${tag.key}_min`);
                  onRemoveFilter(`${tag.key}_max`);
                } else {
                  onRemoveFilter(tag.key);
                }
              }}
              style={styles.tagClose}>
              <IconSymbol name="xmark" size={12} color={C.tint} />
            </TouchableOpacity>
          </View>
        ))}
        {tags.length > 1 && (
          <TouchableOpacity onPress={onClearAll} style={styles.clearAll}>
            <Text style={[styles.clearAllText, { color: textColor }]}>Clear all</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagClose: {
    padding: 2,
  },
  clearAll: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
