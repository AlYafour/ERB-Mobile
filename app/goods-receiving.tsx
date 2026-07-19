import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';
import { useCancellableFetch } from '@/lib/hooks/use-cancellable-fetch';
import { goodsReceivingApi, GoodsReceivedNote } from '@/lib/api/goods-receiving';
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
import { PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { AppPermissionGate } from '@/components/AppPermissionGate';

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  partial: 'Partial',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function getStatusVariant(status?: string): 'success' | 'danger' | 'warning' | 'info' | 'default' {
  switch (status) {
    case 'completed': return 'success';
    case 'cancelled': return 'danger';
    case 'partial':   return 'warning';
    case 'draft':     return 'default';
    default:          return 'info';
  }
}

/**
 * Memoized list row — re-renders only when its item or theme changes, not on
 * every parent state change (pagination, filters, loading flags).
 */
const GRNCard = React.memo(function GRNCard({
  item,
  colors,
  onOpen,
}: {
  item: GoodsReceivedNote;
  colors: typeof Colors.light | typeof Colors.dark;
  onOpen: (id: number) => void;
}) {
  const poObj = typeof item.purchase_order === 'object' ? item.purchase_order as any : null;
  // Fall back to the numeric id when purchase_order is a populated object
  // without order_number — previously this stringified the whole object
  // into "PO-[object Object]".
  const poNum = poObj?.order_number ?? (item.purchase_order ? `PO-${poObj?.id ?? item.purchase_order}` : null);
  const supplierName = poObj?.supplier_name ?? (typeof poObj?.supplier === 'object' ? poObj?.supplier?.name : null);
  const receiptDate = item.receipt_date
    ? new Date(item.receipt_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const itemCount = item.total_items ?? item.items?.length ?? null;

  return (
    <AppCard
      style={styles.receiptCard}
      onPress={() => onOpen(item.id)}
    >
      {/* Icon + GRN code/supplier + badge */}
      <View style={styles.topRow}>
        <DocumentIconTile type="goods_receiving" />
        <View style={styles.titleCol}>
          <Text style={[styles.grnNumber, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.grn_number || `GRN-${item.id}`}
          </Text>
          {supplierName ? (
            <Text style={[styles.supplierText, { color: colors.textSecondary }]} numberOfLines={1}>
              {supplierName}
            </Text>
          ) : null}
        </View>
        <AppBadge variant={getStatusVariant(item.status)}>
          {statusLabels[item.status] || item.status || 'Unknown'}
        </AppBadge>
      </View>

      {/* Meta rows */}
      {poNum ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Linked PO</Text>
          <Text style={[styles.metaValue, { color: colors.primary }]} numberOfLines={1}>{poNum}</Text>
        </View>
      ) : null}
      {item.received_by_name ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Received By</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.received_by_name}
          </Text>
        </View>
      ) : null}
      {receiptDate ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Receipt Date</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{receiptDate}</Text>
        </View>
      ) : null}
      {itemCount !== null && itemCount > 0 ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Items</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </Text>
        </View>
      ) : null}
    </AppCard>
  );
});

function GoodsReceivingScreenInner() {
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const colors = Colors[cs];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<GoodsReceivedNote> | null>(null);
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

  // Debounce search 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadReceipts = useCallback(async () => {
    const { seq } = nextSignal();
    setError(null);
    if (hasLoadedOnce.current) setListLoading(true);
    try {
      const response = await goodsReceivingApi.getAll({
        page,
        page_size: 50,
        search: debouncedSearch,
        ...filters,
      });
      if (!isCurrent(seq) || !mountedRef.current) return;
      setData(response);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      if (!isCurrent(seq) || !mountedRef.current) return;
      setError(err.message || 'Failed to load goods receiving');
      toast(err.message || 'Failed to load goods receiving', 'error');
    } finally {
      if (isCurrent(seq) && mountedRef.current) {
        setInitialLoading(false);
        setListLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, debouncedSearch, filters, nextSignal, isCurrent, mountedRef]);

  useEffect(() => { loadReceipts(); }, [loadReceipts]);

  const onRefresh = () => { setRefreshing(true); loadReceipts(); };

  const filterFields: FilterField[] = [
    {
      name: 'status', label: 'Status', type: 'select', group: 'Status',
      options: [
        { value: 'draft',      label: 'Draft' },
        { value: 'partial',    label: 'Partial' },
        { value: 'completed',  label: 'Completed' },
        { value: 'cancelled',  label: 'Cancelled' },
      ],
    },
    { name: 'receipt_date_after',  label: 'Receipt Date From', type: 'date', group: 'Dates' },
    { name: 'receipt_date_before', label: 'Receipt Date To',   type: 'date', group: 'Dates' },
  ];

  const handleFilterChange = (f: Record<string, any>) => { setFilters(f); setPage(1); };
  const handleFilterReset  = () => { setFilters({}); setPage(1); };
  const handleRemoveFilter = (key: string) => {
    const f = { ...filters }; delete f[key]; setFilters(f); setPage(1);
  };

  // Stale-list fix: refetch when the screen regains focus (create/detail flows)
  useRefetchOnFocus(loadReceipts);

  const openReceipt = useCallback(
    (id: number) => router.push(`/goods-receiving/${id}` as any),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: GoodsReceivedNote }) => (
      <GRNCard item={item} colors={colors} onOpen={openReceipt} />
    ),
    [colors, openReceipt],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.innerContainer}>
        {/* No "New" button: a GRN is created from an approved Purchase Order's
            "Create GRN" card (the form needs purchase_order_id) — the old
            button opened it context-free and it loaded nothing. */}
        <AppHeader
          title="Goods Receiving"
          subtitle={data?.count != null ? `${data.count} note${data.count !== 1 ? 's' : ''}` : undefined}
          showBack
        />

        {/* Search & filter */}
        <ListSearchBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search receipts..."
          filterFields={filterFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFilterReset={handleFilterReset}
          filterSaveKey="goods-receiving"
        />

        {Object.keys(filters).length > 0 && (
          <FilterTags
            filters={filters}
            fields={filterFields}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={() => { setFilters({}); setPage(1); }}
          />
        )}

        {/* Content */}
        {initialLoading ? (
          <AppEmptyState variant="loading" title="Loading receipts..." />
        ) : error && !data?.results?.length ? (
          <AppErrorState title="Failed to load" message={error} onRetry={loadReceipts} />
        ) : !data?.results?.length && !listLoading ? (
          <AppEmptyState
            variant="empty"
            icon="tray"
            title="No goods receiving notes"
            message="No GRN records found matching your criteria."
          />
        ) : (
          <View style={{ flex: 1 }}>
            {/* Slim reload bar — the list and its pagination stay mounted */}
            {listLoading && !refreshing ? (
              <View style={[styles.reloadBar, { backgroundColor: colors.surfaceSoft }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.reloadText, { color: colors.textMuted }]}>Updating…</Text>
              </View>
            ) : null}
            <FlatList
              data={data?.results ?? []}
              renderItem={renderItem}
              keyExtractor={(item, index) => String(item.id ?? index)}
              contentContainerStyle={styles.listContent}
              style={listLoading ? { opacity: 0.6 } : undefined}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
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
  innerContainer: { flex: 1 },

  listContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },

  receiptCard: { marginBottom: Spacing.sm },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  titleCol: { flex: 1, gap: 2 },
  grnNumber: { fontSize: 14, fontWeight: '600' },
  supplierText: { fontSize: 13, lineHeight: 18 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 3,
  },
  metaLabel: { fontSize: 12, fontWeight: '500', minWidth: 88, flexShrink: 0 },
  metaValue: { fontSize: 13, flex: 1 },

  reloadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  reloadText: { fontSize: 12, fontWeight: '500' },
});


export default function GoodsReceivingScreen() {
  return (
    <AppPermissionGate category="goods_receiving" action="view">
      <GoodsReceivingScreenInner />
    </AppPermissionGate>
  );
}
