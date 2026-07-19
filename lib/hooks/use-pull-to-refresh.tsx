import React from 'react';
import { RefreshControl } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Shared <RefreshControl> element duplicated identically across every
 * detail screen's ScrollView:
 *
 * ```tsx
 * <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
 *   tintColor={C.primary} colors={[C.primary]} />
 * ```
 *
 * Takes the screen's own `refreshing` flag and `onRefresh` callback — which
 * may come from `useDetailFetch`'s returned `refreshing`/`onRefresh`, or from
 * a locally-managed `useState` (e.g. tracking.tsx, users/[id].tsx) — and
 * returns the ready-to-spread element, so screens don't hand-roll the
 * tintColor/colors theme wiring themselves.
 */
export function usePullToRefresh(refreshing: boolean, onRefresh: () => void) {
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={C.primary}
      colors={[C.primary]}
    />
  );
}
