/**
 * Design System - Layout Constants
 * Premium layout system for consistent spacing and alignment
 */

import { Spacing } from './spacing';

export const Layout = {
  // Screen Padding
  screenPadding: Spacing.md, // 16px
  
  // Card Spacing
  cardPadding: 20,
  cardMarginBottom: Spacing.md, // 16px
  cardGap: Spacing.md, // 16px
  
  // Section Spacing
  sectionMarginTop: Spacing.lg, // 24px
  sectionMarginBottom: Spacing.lg, // 24px
  
  // Header Spacing
  headerPadding: Spacing.md, // 16px
  headerHeight: 56,
  
  // Form Spacing
  formGroupMarginBottom: 20,
  formRowGap: Spacing.md, // 16px
  
  // List Spacing
  listItemPadding: Spacing.md, // 16px
  listItemGap: Spacing.sm, // 8px
  
  // Button Spacing
  buttonGap: Spacing.sm, // 8px
  buttonGroupGap: Spacing.sm, // 8px
  
  // Grid Spacing
  gridGap: Spacing.md, // 16px
  gridItemGap: Spacing.sm, // 8px
} as const;

