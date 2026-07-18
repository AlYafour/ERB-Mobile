import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ModuleTints } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DOCUMENT_TYPE_META, ProcurementDocType } from '@/constants/procurement';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface DocumentIconTileProps {
  type: ProcurementDocType;
  size?: number;
}

/**
 * Small tinted glyph identifying a procurement record's type at a glance —
 * same tile treatment as the HR request-type cards, reused here so the
 * whole procurement module reads as one family instead of screen-by-screen
 * plain text lists.
 */
export function DocumentIconTile({ type, size = 38 }: DocumentIconTileProps) {
  const cs = useColorScheme() ?? 'light';
  const meta = DOCUMENT_TYPE_META[type];
  const tint = ModuleTints[cs][meta.tint];

  return (
    <View
      style={[
        s.tile,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: tint.bg },
      ]}
    >
      <IconSymbol name={meta.icon as any} size={size * 0.46} color={tint.fg} />
    </View>
  );
}

const s = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
