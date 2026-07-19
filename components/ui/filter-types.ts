/**
 * Shared filter types/helpers for FilterPanel + FilterTags so the two stay in
 * sync instead of maintaining independently-duplicated definitions.
 */

export interface FilterField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'boolean' | 'range';
  options?: { value: string | number; label: string }[];
  placeholder?: string;
  group?: string;
}

/** True when a filter value should count as "active" (i.e. not empty/unset). */
export function isActiveFilterValue(value: any): boolean {
  return value !== '' && value !== null && value !== undefined;
}
