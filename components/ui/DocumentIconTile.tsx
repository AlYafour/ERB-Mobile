import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ModuleTints } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DOCUMENT_TYPE_META, ProcurementDocType } from '@/constants/procurement';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';

type TintKey = keyof typeof ModuleTints.light;

type DocumentIconTileProps =
  | { type: ProcurementDocType; size?: number; icon?: never; tint?: never }
  | { type?: never; icon: IconSymbolName; tint: TintKey; size?: number };

/**
 * Small tinted glyph identifying a record's type at a glance — used across
 * the procurement module (via `type`, resolved through DOCUMENT_TYPE_META)
 * and by non-procurement lists like HR requests (via a direct `icon`+`tint`
 * pair) so every list screen in the app shares one tile treatment instead of
 * each one hand-rolling its own.
 */
export function DocumentIconTile(props: DocumentIconTileProps) {
  const cs = useColorScheme() ?? 'light';
  const size = props.size ?? 38;
  const { icon, tintKey } = props.type
    ? { icon: DOCUMENT_TYPE_META[props.type].icon as IconSymbolName, tintKey: DOCUMENT_TYPE_META[props.type].tint }
    : { icon: props.icon, tintKey: props.tint };
  const tint = ModuleTints[cs][tintKey];

  return (
    <View
      style={[
        s.tile,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: tint.bg },
      ]}
    >
      <IconSymbol name={icon} size={size * 0.46} color={tint.fg} />
    </View>
  );
}

const s = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
