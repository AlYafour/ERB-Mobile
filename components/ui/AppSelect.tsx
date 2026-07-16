/**
 * Canonical name for the design-system select control.
 * The implementation lives in SearchableDropdown.tsx (modal picker with
 * search, clear, disabled states) — this alias keeps the App* namespace
 * consistent without duplicating code.
 */
export { default as AppSelect, type DropdownOption as AppSelectOption } from '@/components/ui/SearchableDropdown';
