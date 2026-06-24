/**
 * Common Styles - Premium Design System
 * Reusable style patterns for consistent UI across all screens
 */

import { StyleSheet } from 'react-native';
import { Colors } from './theme';
import { Spacing, BorderRadius, Typography } from './spacing';
import { Layout } from './layout';

export const CommonStyles = StyleSheet.create({
  // Screen Container
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },

  // Header Styles
  header: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md, // SafeAreaView handles Status Bar
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    backgroundColor: Colors.light.background,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  headerLeft: {
    flex: 1,
    minWidth: 200,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.normal,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },

  // Search Card
  searchCard: {
    marginHorizontal: Layout.screenPadding,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },

  // Content
  scrollContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'] + Spacing.lg, // Extra bottom padding for Navigation Bar
  },
  listContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'] + Spacing.lg, // Extra bottom padding for Navigation Bar
  },

  // Cards
  card: {
    marginBottom: Layout.cardMarginBottom,
    padding: Layout.cardPadding,
  },
  itemCard: {
    marginBottom: Spacing.md,
    padding: Layout.cardPadding,
  },

  // Loading & Empty States
  loadingCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginHorizontal: Layout.screenPadding,
    marginTop: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginHorizontal: Layout.screenPadding,
    marginTop: Spacing.lg,
  },
  emptyText: {
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.medium,
  },

  // Select All Container
  selectAllContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    backgroundColor: Colors.light.backgroundSecondary,
  },

  // Item Styles
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    flex: 1,
    letterSpacing: 0.2,
    color: Colors.light.text,
  },
  itemDetails: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.light.textSecondary,
  },
  detailValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.normal,
    color: Colors.light.text,
  },
  itemActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'] + Spacing.lg, // Extra bottom padding for Navigation Bar
    gap: Spacing.md,
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  paginationButton: {
    minWidth: 90,
  },
  paginationText: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    flex: 1,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },

  // Form Styles
  formGroup: {
    marginBottom: Layout.formGroupMarginBottom,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  formGroupHalf: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  label: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.sm,
    color: Colors.light.text,
    letterSpacing: 0.1,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
    color: Colors.light.text,
  },

  // Button Groups
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  submitContainer: {
    marginTop: Layout.sectionMarginTop,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },

  // Select Mode
  selectModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.light.borderLight,
    marginRight: Spacing.md,
  },
  selectModeLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  selectModeButton: {
    minWidth: 70,
    paddingHorizontal: Spacing.md,
  },
  bulkDeleteButton: {
    minWidth: 110,
  },
});

