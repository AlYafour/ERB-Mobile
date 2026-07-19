import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';
import { useCancellableFetch } from '@/lib/hooks/use-cancellable-fetch';
import { purchaseQuotationsApi } from '@/lib/api/purchase-quotations';
import { toast } from '@/lib/hooks/use-toast';
import { ListSearchBar } from '@/components/ui/ListSearchBar';
import { FilterField } from '@/components/ui/FilterPanel';
import FilterTags from '@/components/ui/FilterTags';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { DocumentIconTile } from '@/components/ui/DocumentIconTile';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppPagination } from '@/components/ui/AppPagination';
import { PurchaseQuotation, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { AppPermissionGate } from '@/components/AppPermissionGate';

const statusLabels: Record<string, string> = {
  pending:   'Pending',
  awarded:   'Awarded',
  rejected:  'Rejected',
  expired:   'Expired',
  cancelled: 'Cancelled',
};

function getStatusVariant(s?: string): 'success' | 'danger' | 'warning' | 'info' | 'default' {
  switch (s) {
    case 'awarded':   return 'success';
    case 'rejected':
    case 'cancelled':
    case 'expired':   return 'danger';
    case 'pending':   return 'warning';
    default:          return 'default';
  }
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Memoized list row — re-renders only when its item or theme changes, not on
 * every parent state change (pagination, filters, loading flags).
 */
const PQCard = React.memo(function PQCard({
  item,
  colors,
  onOpen,
}: {
  item: PurchaseQuotation;
  colors: typeof Colors.light | typeof Colors.dark;
  onOpen: (id: number) => void;
}) {
  const itemId       = Number(item.id);
  const pqNum        = (item as any).quotation_number || `PQ-${itemId}`;
  const supplierName = typeof item.supplier === 'object'
    ? item.supplier?.name : (item as any).supplier_name || null;
  const quotDate     = fmtDate((item as any).quotation_date);
  const validUntil   = fmtDate((item as any).valid_until);
  const total        = (item as any).total ?? (item as any).total_amount;

  return (
    <AppCard style={styles.itemCard} onPress={() => onOpen(itemId)}>
      <View style={styles.topRow}>
        <DocumentIconTile type="purchase_quotation" />
        <View style={styles.titleCol}>
          <Text style={[styles.itemNum, { color: colors.primary }]} numberOfLines={1}>{pqNum}</Text>
          {supplierName ? (
            <Text style={[styles.supplierText, { color: colors.textSecondary }]} numberOfLines={1}>{supplierName}</Text>
          ) : null}
        </View>
        <AppBadge variant={getStatusVariant(item.status)}>
          {statusLabels[item.status || ''] || item.status || 'Unknown'}
        </AppBadge>
      </View>
      {quotDate ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Quotation Date</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{quotDate}</Text>
        </View>
      ) : null}
      {validUntil ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Valid Until</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{validUntil}</Text>
        </View>
      ) : null}
      {total != null ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.metaValue, { color: colors.success, fontWeight: '700' }]}>
            AED {Number(total).toFixed(2)}
          </Text>
        </View>
      ) : null}
    </AppCard>
  );
});

function PurchaseQuotationsScreenInner() {
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<PurchaseQuotation> | null>(null);
  // initialLoading fills the screen once; listLoading (pagination / filter /
  // search reloads) keeps the list AND its pagination footer mounted.
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stale-response guard: an older response never overwrites a newer one,
  // and nothing sets state after unmount.
  const { nextSignal, isCurrent, mountedRef } = useCancellableFetch();
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadQuotations = useCallback(async () => {
    const { seq } = nextSignal();
    setError(null);
    if (hasLoadedOnce.current) setListLoading(true);
    try {
      const response = await purchaseQuotationsApi.getAll({ page, page_size: 50, search: debouncedSearch, ...filters });
      if (!isCurrent(seq) || !mountedRef.current) return;
      setData(response);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      if (!isCurrent(seq) || !mountedRef.current) return;
      setError(err.message || 'Failed to load purchase quotations');
      toast(err.message || 'Failed to load purchase quotations', 'error');
    } finally {
      if (isCurrent(seq) && mountedRef.current) {
        setInitialLoading(false);
        setListLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, debouncedSearch, filters, nextSignal, isCurrent, mountedRef]);

  useEffect(() => { loadQuotations(); }, [loadQuotations]);

  const onRefresh = () => { setRefreshing(true); loadQuotations(); };

  const filterFields: FilterField[] = [
    { name: 'quotation_number', label: 'Quotation Number', type: 'text', group: 'Quotation Info' },
    {
      name: 'status', label: 'Status', type: 'select', group: 'Status',
      options: [
        { value: 'pending',   label: 'Pending' },
        { value: 'awarded',   label: 'Awarded' },
        { value: 'rejected',  label: 'Rejected' },
        { value: 'expired',   label: 'Expired' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { name: 'quotation_date_after',  label: 'Quotation Date From', type: 'date', group: 'Dates' },
    { name: 'quotation_date_before', label: 'Quotation Date To',   type: 'date', group: 'Dates' },
    { name: 'valid_until_after',  label: 'Valid Until From', type: 'date', group: 'Dates' },
    { name: 'valid_until_before', label: 'Valid Until To',   type: 'date', group: 'Dates' },
    { name: 'total', label: 'Total Amount', type: 'range', group: 'Amount' },
  ];

  const handleFilterChange = (f: Record<string, any>) => { setFilters(f); setPage(1); };
  const handleFilterReset  = () => { setFilters({}); setPage(1); };
  const handleRemoveFilter = (key: string) => {
    const f = { ...filters }; delete f[key]; setFilters(f); setPage(1);
  };

  // Stale-list fix: refetch when the screen regains focus (create/detail flows)
  useRefetchOnFocus(loadQuotations);

  const openQuotation = useCallback(
    (id: number) => router.push(`/purchase-quotations/${id}` as any),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: PurchaseQuotation }) => (
      <PQCard item={item} colors={C} onOpen={openQuotation} />
    ),
    [C, openQuotation],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        {/* No "New" button: quotations are created from a Quotation Request's
            detail flow — the old button pointed at a route that doesn't exist
            and landed users on the Unmatched Route screen. */}
        <AppHeader
          title="Purchase Quotations"
          subtitle={data?.count != null ? `${data.count} quotation${data.count !== 1 ? 's' : ''}` : undefined}
          showBack
        />

        <ListSearchBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search purchase quotations..."
          filterFields={filterFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFilterReset={handleFilterReset}
          filterSaveKey="purchase-quotations"
        />

        {Object.keys(filters).length > 0 && (
          <FilterTags filters={filters} fields={filterFields}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={() => { setFilters({}); setPage(1); }} />
        )}

        {initialLoading ? (
          <AppEmptyState variant="loading" title="Loading purchase quotations..." />
        ) : error && !data?.results?.length ? (
          <AppErrorState title="Failed to load" message={error} onRetry={loadQuotations} />
        ) : !data?.results?.length && !listLoading ? (
          <AppEmptyState variant="empty" icon="doc.text" title="No purchase quotations"
            message="No purchase quotations found matching your criteria." />
        ) : (
          <View style={{ flex: 1 }}>
            {/* Slim reload bar — the list and its pagination stay mounted */}
            {listLoading && !refreshing ? (
              <View style={[styles.reloadBar, { backgroundColor: C.surfaceSoft }]}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={[styles.reloadText, { color: C.textMuted }]}>Updating…</Text>
              </View>
            ) : null}
            <FlatList
              data={data?.results ?? []}
              renderItem={renderItem}
              keyExtractor={(item, index) => String(item.id ?? index)}
              contentContainerStyle={styles.listContent}
              style={listLoading ? { opacity: 0.6 } : undefined}
              refreshControl={
                <RefreshControl refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={C.primary} colors={[C.primary]} />
              }
              ListFooterComponent={
                data && data.count > 50 ? (
                  <AppPagination
                    page={page}
                    pageSize={50}
                    totalCount={data.count}
                    hasPrevious={!!data.previous}
                    hasNext={!!data.next}
                    onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                    onNext={() => setPage((p) => p + 1)}
                    loading={listLoading}
                  />
                ) : null
              }
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner:     { flex: 1 },

  listContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  itemCard: { marginBottom: Spacing.sm },

  topRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.md,
  },
  titleCol: { flex: 1, gap: 2 },
  itemNum: { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  supplierText: { fontSize: 13, lineHeight: 18 },

  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, paddingVertical: 3,
  },
  metaLabel: { fontSize: 12, fontWeight: '500', minWidth: 110, flexShrink: 0 },
  metaValue: { fontSize: 13, flex: 1 },

  reloadBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 6,
  },
  reloadText: { fontSize: 12, fontWeight: '500' },
});


export default function PurchaseQuotationsScreen() {
  return (
    <AppPermissionGate category="purchase_quotation" action="view">
      <PurchaseQuotationsScreenInner />
    </AppPermissionGate>
  );
}
