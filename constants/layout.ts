import { Spacing, CARD_PADDING } from './spacing';

export const Layout = {
  screenPadding:     Spacing.lg,    // 16
  cardPadding:       CARD_PADDING, // 18 — single source: constants/spacing.ts
  cardMarginBottom:  Spacing.md,    // 12
  cardGap:           Spacing.md,    // 12
  sectionMarginTop:  Spacing.xl,    // 20
  sectionMarginBottom: Spacing.xl,  // 20
  headerPadding:     Spacing.lg,    // 16
  headerHeight:      64,
  formGroupMarginBottom: 18,
  formRowGap:        Spacing.md,    // 12
  listItemPadding:   Spacing.lg,    // 16
  listItemGap:       Spacing.sm,    // 8
  buttonGap:         Spacing.sm,    // 8
  buttonGroupGap:    Spacing.sm,    // 8
  gridGap:           Spacing.md,    // 12
  gridItemGap:       Spacing.sm,    // 8
} as const;
