import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast } from '@/lib/hooks/use-toast';
import { Input } from '@/components/ui/Input';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import FilterTags from '@/components/ui/FilterTags';
import { PurchaseOrder, PaginatedResponse } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge } from '@/components/ui/AppBadge';
import { useColorScheme } from '@/hooks/use-color-scheme';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function PurchaseOrdersScreen() {
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperuser = user?.is_superuser ?? false;
  const canCreate = isSuperuser || (hasPermission('purchase_order', 'create') ?? false);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadOrders(); }, [page, debouncedSearch, filters]);

  const loadOrders = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await purchaseOrdersApi.getAll({ page, page_size: 50, search: debouncedSearch, ...filters });
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load purchase orders');
      toast(err.message || 'Failed to load purchase orders', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  const getStatusVariant = (status?: string): 'success' | 'danger' | 'warning' | 'info' => {
    switch (status) {
      case 'approved': case 'completed': return 'success';
      case 'rejected': case 'cancelled': return 'danger';
      case 'pending':  return 'warning';
      default:         return 'info';
    }
  };

  const renderItem = ({ item }: { item: PurchaseOrder }) => {
    const itemId    = Number(item.id);
    const orderNum  = item.order_number || `LPO-${itemId}`;
    const supplier  = typeof item.supplier === 'object'
      ? (item.supplier as any)?.name
      : (item as any).supplier_name || null;
    const project   = typeof (item as any).project === 'object'
      ? (item as any).project?.name
      : (item as any).project_name || null;
    const prCode    = (item as any).purchase_request_number || (item as any).purchase_request_code || null;
    const orderDate = (item as any).order_date
      ? new Date((item as any).order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
    const delivRaw: string | undefined = (item as any).delivery_date;
    const delivDate  = delivRaw ? new Date(delivRaw) : null;
    const delivLabel = delivDate
      ? delivDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
    const now        = new Date();
    const isActive   = item.status !== 'completed' && item.status !== 'rejected' && item.status !== 'cancelled';
    const isOverdue  = delivDate && isActive && delivDate < now;
    const isUrgent   = delivDate && isActive && delivDate < new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const delivColor = isOverdue ? colors.danger : isUrgent ? colors.warning : colors.textPrimary;
    const total      = (item as any).total_amount ?? (item as any).total ?? null;
    const itemCount  = item.items?.length ?? null;

    return (
      <AppCard style={styles.itemCard} onPress={() => router.push(`/purchase-orders/${itemId}` as any)}>
        <View style={styles.topRow}>
          <Text style={[styles.itemCode, { color: colors.textPrimary }]} numberOfLines={1}>{orderNum}</Text>
          <AppBadge variant={getStatusVariant(item.status)}>
            {statusLabels[item.status || ''] || item.status || 'Unknown'}
          </AppBadge>
        </View>

        {supplier ? (
          <Text style={[styles.supplierText, { color: colors.textSecondary }]} numberOfLines={2}>{supplier}</Text>
        ) : null}

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
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.innerContainer}>
        <AppHeader
          title="Purchase Orders"
          subtitle={data?.count != null ? `${data.count} order${data.count !== 1 ? 's' : ''}` : undefined}
          right={canCreate ? (
            <AppButton title="New LPO" variant="primary" size="sm"
              onPress={() => router.push('/purchase-orders/new' as any)} />
          ) : undefined}
        />

        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Input
                placeholder="Search orders..."
                value={search}
                onChangeText={setSearch}
                containerStyle={styles.searchInput}
                leftIcon={<IconSymbol name="magnifyingglass" size={20} color={colors.textMuted} />}
              />
            </View>
            <View style={styles.filterBtnWrapper}>
              <FilterPanel
                fields={filterFields}
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleFilterReset}
                saveKey="purchase-orders"
              />
            </View>
          </View>
        </View>

        {Object.keys(filters).length > 0 && (
          <FilterTags
            filters={filters}
            fields={filterFields}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={() => { setFilters({}); setPage(1); }}
          />
        )}

        {loading && !refreshing ? (
          <AppEmptyState variant="loading" title="Loading orders..." />
        ) : error && !data?.results?.length ? (
          <AppEmptyState variant="error" title="Failed to load" message={error} actionLabel="Try Again" onAction={loadOrders} />
        ) : !data?.results?.length ? (
          <AppEmptyState variant="empty" icon="cart" title="No purchase orders" message="No orders found matching your criteria." />
        ) : (
          <FlatList
            data={data.results}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id || Math.random())}
            contentContainerStyle={styles.listContent}
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
                <View style={[styles.pagination, { backgroundColor: colors.surfaceSoft, borderTopColor: colors.border }]}>
                  <AppButton title="Previous" variant="secondary" size="sm"
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.previous || page === 1} style={styles.paginationBtn} />
                  <Text style={[styles.paginationText, { color: colors.textMuted }]}>
                    {((page - 1) * 50) + 1}–{Math.min(page * 50, data.count)} of {data.count}
                  </Text>
                  <AppButton title="Next" variant="secondary" size="sm"
                    onPress={() => setPage((p) => p + 1)}
                    disabled={!data.next} style={styles.paginationBtn} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  innerContainer: { flex: 1 },

  searchContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchRow:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchInputWrapper: { flex: 1 },
  searchInput:        { marginBottom: 0 },
  filterBtnWrapper:   { alignSelf: 'flex-start' },

  listContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  itemCard:     { marginBottom: Spacing.sm },

  topRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  itemCode:     { fontSize: 14, fontWeight: '600', flex: 1 },
  supplierText: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.sm },

  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, paddingVertical: 3,
  },
  metaLabel: { fontSize: 12, fontWeight: '500', minWidth: 80, flexShrink: 0 },
  metaValue: { fontSize: 13, flex: 1 },

  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    gap: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth,
  },
  paginationBtn:  { minWidth: 80 },
  paginationText: { fontSize: Typography.sizes.sm, textAlign: 'center', flex: 1 },
});
