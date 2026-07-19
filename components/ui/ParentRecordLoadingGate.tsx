import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppHeader } from './AppHeader';
import { AppEmptyState } from './AppEmptyState';

interface ParentRecordLoadingGateProps {
  /** AppHeader title shown while the parent record loads. */
  title: string;
  /** AppEmptyState loading message. */
  loadingTitle?: string;
  showBack?: boolean;
}

/**
 * ParentRecordLoadingGate — full-screen SafeAreaView > AppHeader > AppEmptyState(loading)
 * gate shown while a create/edit screen's parent record (e.g. the source purchase
 * order) is still being fetched. Generalizes the gate duplicated in
 * goods-receiving/new.tsx, purchase-invoices/new.tsx, purchase-orders/new.tsx,
 * and quotation-requests/new.tsx.
 */
export function ParentRecordLoadingGate({
  title,
  loadingTitle = 'Loading...',
  showBack = true,
}: ParentRecordLoadingGateProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
      <AppHeader title={title} showBack={showBack} />
      <View style={s.center}>
        <AppEmptyState variant="loading" title={loadingTitle} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
