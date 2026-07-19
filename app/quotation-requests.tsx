import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';
import { useCancellableFetch } from '@/lib/hooks/use-cancellable-fetch';
import { quotationRequestsApi } from '@/lib/api/quotation-requests';
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
import { QuotationRequest, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { AppPermissionGate } from '@/components/AppPermissionGate';

const statusLabels: Record<string, string> = {
  pending:   'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function getStatusVariant(s?: string): 'success' | 'danger' | 'warning' | 'info' | 'default' {
  switch (s) {
    case 'completed': return 'success';
    case 'cancelled': return 'danger';
    case 'pending':   return 'warning';
    default:          return 'default';
  }
}

/**
 * Memoized list row — re-renders only when its item or theme changes, not on
 * every parent state change (pagination, filters, loading flags).
 */
const QRCard = React.memo(function QRCard({
  item,
  colors,
  onOpen,
}: {
  item: QuotationRequest;
  colors: typeof Colors.light | typeof Colors.dark;
  onOpen: (id: number) => void;
}) {
  const itemId       = Number(item.id);
  const qrNum        = (item as any).request_number || `QR-${itemId}`;
  const prNumber     = typeof item.purchase_request === 'object'
    ? (item.purchase_request as any)?.code || (item.purchase_request as any)?.request_number
    : (item as any).purchase_request_code || null;
  const supplierCount = item.suppliers && Array.isArray(item.suppliers) ? item.suppliers.length : null;
  const createdDate  = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <AppCard style={styles.itemCard} onPress={() => onOpen(itemId)}>
      <View style={styles.topRow}>
        <DocumentIconTile type="quotation_request" />
        <Text style={[styles.itemNum, { color: colors.primary }]} numberOfLines={1}>{qrNum}</Text>
        <AppBadge variant={getStatusVariant(item.status)}>
          {statusLabels[item.status || ''] || item.status || 'Unknown'}
        </AppBadge>
      </View>
      {prNumber ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Purchase Request</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>{prNumber}</Text>
        </View>
      ) : null}
      {supplierCount !== null ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Suppliers</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>
            {supplierCount} supplier{supplierCount !== 1 ? 's' : ''} requested
          </Text>
        </View>
      ) : null}
      {createdDate ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Created</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{createdDate}</Text>
        </View>
      ) : null}
    </AppCard>
  );
});

function QuotationRequestsScreenInner() {
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<QuotationRequest> | null>(null);
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

  const loadRequests = useCallback(async () => {
    const { seq } = nextSignal();
    setError(null);
    if (hasLoadedOnce.current) setListLoading(true);
    try {
      const response = await quotationRequestsApi.getAll({ page, page_size: 50, search: debouncedSearch, ...filters });
      if (!isCurrent(seq) || !mountedRef.current) return;
      setData(response);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      if (!isCurrent(seq) || !mountedRef.current) return;
      setError(err.message || 'Failed to load quotation requests');
      toast(err.message || 'Failed to load quotation requests', 'error');
    } finally {
      if (isCurrent(seq) && mountedRef.current) {
        setInitialLoading(false);
        setListLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, debouncedSearch, filters, nextSignal, isCurrent, mountedRef]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const onRefresh = () => { setRefreshing(true); loadRequests(); };

  const filterFields: FilterField[] = [
    {
      name: 'status', label: 'Status', type: 'select', group: 'Status',
      options: [
        { value: 'pending',   label: 'Pending' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { name: 'created_at_after',  label: 'Created From', type: 'date', group: 'Dates' },
    { name: 'created_at_before', label: 'Created To',   type: 'date', group: 'Dates' },
  ];

  const handleFilterChange = (f: Record<string, any>) => { setFilters(f); setPage(1); };
  const handleFilterReset  = () => { setFilters({}); setPage(1); };
  const handleRemoveFilter = (key: string) => {
    const f = { ...filters }; delete f[key]; setFilters(f); setPage(1);
  };

  // Stale-list fix: refetch when the screen regains focus (create/detail flows)
  useRefetchOnFocus(loadRequests);

  const openRequest = useCallback(
    (id: number) => router.push(`/quotation-requests/${id}` as any),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: QuotationRequest }) => (
      <QRCard item={item} colors={C} onOpen={openRequest} />
    ),
    [C, openRequest],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        {/* No "New" button: a QR must be created FROM a Purchase Request's
            detail screen (the form needs purchase_request_id) — the old
            button opened it context-free and it loaded nothing. */}
        <AppHeader
          title="Quotation Requests"
          subtitle={data?.count != null ? `${data.count} request${data.count !== 1 ? 's' : ''}` : undefined}
          showBack
        />

        <ListSearchBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search quotation requests..."
          filterFields={filterFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFilterReset={handleFilterReset}
          filterSaveKey="quotation-requests"
        />

        {Object.keys(filters).length > 0 && (
          <FilterTags filters={filters} fields={filterFields}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={() => { setFilters({}); setPage(1); }} />
        )}

        {initialLoading ? (
          <AppEmptyState variant="loading" title="Loading quotation requests..." />
        ) : error && !data?.results?.length ? (
          <AppErrorState title="Failed to load" message={error} onRetry={loadRequests} />
        ) : !data?.results?.length && !listLoading ? (
          <AppEmptyState variant="empty" icon="doc.text" title="No quotation requests"
            message="No quotation requests found matching your criteria." />
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
  itemNum: { fontSize: 14, fontWeight: '700', flex: 1, letterSpacing: 0.2 },

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


export default function QuotationRequestsScreen() {
  return (
    <AppPermissionGate category="quotation_request" action="view">
      <QuotationRequestsScreenInner />
    </AppPermissionGate>
  );
}
