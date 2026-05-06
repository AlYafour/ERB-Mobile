/**
 * Premium Design System - Spacing
 * Consistent and sufficient spacing on all sides
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
  '6xl': 96,
} as const;

/**
 * Premium Design System - Border Radius
 */
export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

/**
 * Premium Design System - Typography
 */
export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  weights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  families: {
    inter: {
      black: 'Inter-Black',
      bold: 'Inter-Bold',
      semibold: 'Inter-SemiBold',
      medium: 'Inter-Medium',
      regular: 'Inter-Regular',
      light: 'Inter-Light',
    },
  },
} as const;

/**
 * Premium Design System - Component Sizes
 */
export const ComponentSizes = {
  button: {
    small: {
      height: 36,
      paddingHorizontal: 16,
    },
    medium: {
      height: 44,
      paddingHorizontal: 20,
    },
    large: {
      height: 52,
      paddingHorizontal: 24,
    },
  },
  input: {
    small: {
      height: 40,
    },
    medium: {
      height: 48,
    },
    large: {
      height: 56,
    },
  },
  card: {
    padding: Spacing.lg,
  },
} as const;

/**
 * Premium Design System - Layout
 */
export const Layout = {
  screenPadding: Spacing.lg,
  cardPadding: Spacing.lg,
  sectionPadding: Spacing.xl,
} as const;

