/**
 * Shared base style tokens duplicated identically across every
 * app/**\/[id].tsx and app/**\/[id]/edit.tsx detail/edit screen's
 * makeStyles(C) factory (container/center/content/card/sectionTitle).
 *
 * Spread FIRST into each screen's own StyleSheet.create({ ...baseDetailStyles(C), ... }),
 * then add/override screen-specific keys as needed — e.g. a screen that wants
 * a different `content` paddingBottom just redeclares `content` after the
 * spread, which wins because object literals apply left-to-right.
 */
export function baseDetailStyles(C: { background: string; textPrimary: string }) {
  return {
    container: { flex: 1 as const, backgroundColor: C.background },
    center: { flex: 1 as const, justifyContent: 'center' as const, alignItems: 'center' as const },
    content: { padding: 16, paddingBottom: 24 },
    card: { marginBottom: 12 },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: C.textPrimary,
      marginBottom: 14,
      letterSpacing: -0.2,
    },
  };
}
