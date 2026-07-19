import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';
import { useCancellableFetch } from '@/lib/hooks/use-cancellable-fetch';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast } from '@/lib/hooks/use-toast';
import { ListSearchBar } from '@/components/ui/ListSearchBar';
import { FilterField } from '@/components/ui/FilterPanel';
import FilterTags from '@/components/ui/FilterTags';
import { PurchaseOrder, PaginatedResponse } from '@/types';
import { getDateAccent } from '@/lib/utils/list-helpers';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { DocumentIconTile } from '@/components/ui/DocumentIconTile';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppPagination } from '@/components/ui/AppPagination';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function getStatusVariant(status?: string): 'success' | 'danger' | 'warning' | 'info' {
  switch (status) {
    case 'approved': case 'completed': return 'success';
    case 'rejected': case 'cancelled': return 'danger';
    case 'pending':  return 'warning';
    default:         return 'info';
  }
}

/**
 * Memoized list row — re-renders only when its item or theme changes, not on
 * every parent state change (pagination, filters, loading flags).
 */
const POCard = React.memo(function POCard({
  item,
  colors,
  onOpen,
}: {
  item: PurchaseOrder;
  colors: typeof Colors.light | typeof Colors.dark;
  onOpen: (id: number) => void;
}) {
  const itemId    = Number(item.id);
  const orderNum  = item.order_number || `LPO-${itemId}`;
  const supplier  = typeof item.supplier === 'object'
    ? item.supplier?.name
    : item.supplier_name || null;
  const project   = typeof item.project === 'object'
    ? item.project?.name
    : item.project_name || null;
  const prCode    = item.purchase_request_number || item.purchase_request_code || null;
  const orderDate = item.order_date
    ? new Date(item.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const delivRaw: string | undefined = item.delivery_date;
  const delivDate  = delivRaw ? new Date(delivRaw) : null;
  const delivLabel = delivDate
    ? delivDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const isActive   = item.status !== 'completed' && item.status !== 'rejected' && item.status !== 'cancelled';
  const dateAccent = getDateAccent(delivRaw);
  const isOverdue  = isActive && dateAccent.overdue;
  const isUrgent   = isActive && dateAccent.urgent;
  const delivColor = isOverdue ? colors.danger : isUrgent ? colors.warning : colors.textPrimary;
  const total      = item.total_amount ?? item.total ?? null;
  const itemCount  = item.items?.length ?? null;
  const accentColor = isOverdue ? colors.danger : isUrgent ? colors.warning : undefined;

  return (
    <AppCard
      style={[styles.itemCard, accentColor && { borderLeftWidth: 3, borderLeftColor: accentColor }]}
      onPress={() => onOpen(itemId)}
    >
      <View style={styles.topRow}>
        <DocumentIconTile type="purchase_order" />
        <View style={styles.titleCol}>
          <Text style={[styles.itemCode, { color: colors.textPrimary }]} numberOfLines={1}>{orderNum}</Text>
          {supplier ? (
            <Text style={[styles.supplierText, { color: colors.textSecondary }]} numberOfLines={1}>{supplier}</Text>
          ) : null}
        </View>
        <AppBadge variant={getStatusVariant(item.status)}>
          {statusLabels[item.status || ''] || item.status || 'Unknown'}
        </AppBadge>
      </View>

      {project ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Project</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>{project}</Text>
        </View>
      ) : null}
      {prCode ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Linked PR</Text>
          <Text style={[styles.metaValue, { color: colors.primary }]} numberOfLines={1}>{prCode}</Text>
        </View>
      ) : null}
      {orderDate ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Order Date</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{orderDate}</Text>
        </View>
      ) : null}
      {delivLabel ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Delivery</Text>
          <Text style={[styles.metaValue, { color: delivColor, fontWeight: isOverdue || isUrgent ? '600' : '400' }]}>
            {delivLabel}{isOverdue ? ' · Overdue' : isUrgent ? ' · Soon' : ''}
          </Text>
        </View>
      ) : null}
      {total != null ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.metaValue, { color: colors.success, fontWeight: '600' }]}>
            AED {Number(total).toFixed(2)}
          </Text>
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

function PurchaseOrdersScreenInner() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const colors = Colors[cs];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<PurchaseOrder> | null>(null);
  // initialLoading fills the screen once; listLoading (pagination / filter /
  // search reloads) keeps the list AND its pagination footer mounted.
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperuser = user?.is_superuser ?? false;
  const canCreate = isSuperuser || (hasPermission('purchase_order', 'create') ?? false);

  // Stale-response guard: an older response never overwrites a newer one,
  // and nothing sets state after unmount.
  const { nextSignal, isCurrent, mountedRef } = useCancellableFetch();
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadOrders = useCallback(async () => {
    const { seq } = nextSignal();
    setError(null);
    if (hasLoadedOnce.current) setListLoading(true);
    try {
      const response = await purchaseOrdersApi.getAll({ page, page_size: 50, search: debouncedSearch, ...filters });
      if (!isCurrent(seq) || !mountedRef.current) return;
      setData(response);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      if (!isCurrent(seq) || !mountedRef.current) return;
      setError(err.message || 'Failed to load purchase orders');
      toast(err.message || 'Failed to load purchase orders', 'error');
    } finally {
      if (isCurrent(seq) && mountedRef.current) {
        setInitialLoading(false);
        setListLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, debouncedSearch, filters, nextSignal, isCurrent, mountedRef]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const onRefresh = () => { setRefreshing(true); loadOrders(); };

  const filterFields: FilterField[] = [
    { name: 'order_number', label: 'Order Number', type: 'text', group: 'Order Info' },
    {
      name: 'status', label: 'Status', type: 'select', group: 'Status',
      options: [
        { value: 'pending',   label: 'Pending' },
        { value: 'approved',  label: 'Approved' },
        { value: 'rejected',  label: 'Rejected' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { name: 'order_date_after',     label: 'Order Date From',    type: 'date', group: 'Dates' },
    { name: 'order_date_before',    label: 'Order Date To',      type: 'date', group: 'Dates' },
    { name: 'delivery_date_after',  label: 'Delivery Date From', type: 'date', group: 'Dates' },
    { name: 'delivery_date_before', label: 'Delivery Date To',   type: 'date', group: 'Dates' },
  ];

  const handleFilterChange = (f: Record<string, any>) => { setFilters(f); setPage(1); };
  const handleFilterReset  = () => { setFilters({}); setPage(1); };
  const handleRemoveFilter = (key: string) => {
    const f = { ...filters }; delete f[key]; setFilters(f); setPage(1);
  };

  // Stale-list fix: refetch when the screen regains focus (create/detail flows)
  useRefetchOnFocus(loadOrders);

  const openOrder = useCallback(
    (id: number) => router.push(`/purchase-orders/${id}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: PurchaseOrder }) => (
      <POCard item={item} colors={colors} onOpen={openOrder} />
    ),
    [colors, openOrder],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.innerContainer}>
        <AppHeader
          title="Purchase Orders"
          subtitle={data?.count != null ? `${data.count} order${data.count !== 1 ? 's' : ''}` : undefined}
          showBack
          right={canCreate ? (
            <AppButton title="New LPO" variant="primary" size="sm"
              onPress={() => router.push('/purchase-orders/new')} />
          ) : undefined}
        />

        <ListSearchBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search orders..."
          filterFields={filterFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFilterReset={handleFilterReset}
          filterSaveKey="purchase-orders"
        />

        {Object.keys(filters).length > 0 && (
          <FilterTags
            filters={filters}
            fields={filterFields}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={() => { setFilters({}); setPage(1); }}
          />
        )}

        {initialLoading ? (
          <AppEmptyState variant="loading" title="Loading orders..." />
        ) : error && !data?.results?.length ? (
          <AppErrorState title="Failed to load" message={error} onRetry={loadOrders} />
        ) : !data?.results?.length && !listLoading ? (
          <AppEmptyState variant="empty" icon="cart" title="No purchase orders" message="No orders found matching your criteria." />
        ) : (
          <View style={{ flex: 1 }}>
            {/* Slim reload bar — the list and its pagination stay mounted */}
            {listLoading && !refreshing ? (
              <View style={[styles.reloadBar, { backgroundColor: colors.surfaceSoft }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.reloadText, { color: colors.textMuted }]}>Updating…</Text>
              </View>
            ) : null}
            <FlashList
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
  itemCard:     { marginBottom: Spacing.sm },

  topRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.md,
  },
  titleCol: { flex: 1, gap: 2 },
  itemCode:     { fontSize: 14, fontWeight: '600' },
  supplierText: { fontSize: 13, lineHeight: 18 },

  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, paddingVertical: 3,
  },
  metaLabel: { fontSize: 12, fontWeight: '500', minWidth: 80, flexShrink: 0 },
  metaValue: { fontSize: 13, flex: 1 },

  reloadBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 6,
  },
  reloadText: { fontSize: 12, fontWeight: '500' },
});


export default function PurchaseOrdersScreen() {
  return (
    <AppPermissionGate category="purchase_order" action="view">
      <PurchaseOrdersScreenInner />
    </AppPermissionGate>
  );
}
