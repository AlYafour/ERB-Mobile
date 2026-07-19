/**
 * Al Yafour ERP — Design System v2
 * Spacing, radius, typography, layout constants.
 */

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
} as const;

/**
 * Single source for the card corner-radius (20) and padding (18) — referenced
 * below by BorderRadius.card, CardSpec, ComponentSizes.card, and by
 * constants/layout.ts's Layout.cardPadding.
 */
export const CARD_PADDING = 18;
const CARD_RADIUS = 20;

export const BorderRadius = {
  none:  0,
  sm:    10,
  md:    14,
  lg:    18,
  xl:    24,
  '2xl': 32,
  '3xl': 40,
  full:  9999,
  pill:  9999,
  card:  CARD_RADIUS,
} as const;

/** Type scale per spec */
export const TypeScale = {
  display:    { fontSize: 34, fontWeight: '800' as const },
  title1:     { fontSize: 28, fontWeight: '800' as const },
  title2:     { fontSize: 22, fontWeight: '700' as const },
  title3:     { fontSize: 18, fontWeight: '700' as const },
  body:       { fontSize: 16, fontWeight: '400' as const },
  bodyMedium: { fontSize: 16, fontWeight: '600' as const },
  caption:    { fontSize: 13, fontWeight: '500' as const },
  small:      { fontSize: 12, fontWeight: '500' as const },
} as const;

/** Backward compat */
export const Typography = {
  sizes: {
    xs:   12,
    sm:   13,
    base: 16,
    lg:   18,
    xl:   20,
    '2xl': 22,
    '3xl': 28,
    '4xl': 34,
    '5xl': 48,
  },
  weights: {
    light:     '300',
    normal:    '400',
    medium:    '500',
    semibold:  '600',
    bold:      '700',
    extrabold: '800',
    black:     '900',
  },
  families: {
    inter: {
      black:    'Inter-Black',
      bold:     'Inter-Bold',
      semibold: 'Inter-SemiBold',
      medium:   'Inter-Medium',
      regular:  'Inter-Regular',
      light:    'Inter-Light',
    },
  },
} as const;

/** Card spec: radius 20, padding 18 */
export const CardSpec = {
  borderRadius: CARD_RADIUS,
  padding:      CARD_PADDING,
  borderWidth:  1,
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffsetY: 4,
  elevation:    2,
} as const;

export const ComponentSizes = {
  button: {
    small:  { height: 36, paddingHorizontal: 16 },
    medium: { height: 44, paddingHorizontal: 20 },
    large:  { height: 52, paddingHorizontal: 24 },
  },
  input: {
    small:  { height: 40 },
    medium: { height: 48 },
    large:  { height: 56 },
  },
  card: { padding: CARD_PADDING },
} as const;

/**
 * Elevation levels — pair with Colors[scheme].shadow for the shadowColor.
 * Use these instead of ad-hoc shadow objects so surfaces stay consistent.
 */
export const Shadows = {
  none: {
    shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0,
  },
  sm: {
    shadowOpacity: 0.05, shadowRadius: 4,  shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  md: {
    shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  lg: {
    shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
} as const;

/** Accessibility floor for anything tappable (Android/iOS guidelines). */
export const TouchTarget = {
  minHeight: 44,
  minWidth: 44,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;
