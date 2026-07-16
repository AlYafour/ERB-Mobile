import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { goodsReceivingApi, GoodsReceivedNote } from '@/lib/api/goods-receiving';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast } from '@/lib/hooks/use-toast';
import { Input } from '@/components/ui/Input';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import FilterTags from '@/components/ui/FilterTags';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge } from '@/components/ui/AppBadge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing, Typography } from '@/constants/spacing';
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

function GoodsReceivingScreenInner() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const colors = Colors[cs];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<GoodsReceivedNote> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const su = user?.is_superuser ?? false;
  const canCreate = su || (hasPermission('goods_receiving', 'create') ?? false);

  // Debounce search 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadReceipts(); }, [page, debouncedSearch, filters]);

  const loadReceipts = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await goodsReceivingApi.getAll({
        page,
        page_size: 50,
        search: debouncedSearch,
        ...filters,
      });
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load goods receiving');
      toast(err.message || 'Failed to load goods receiving', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  const renderItem = ({ item }: { item: GoodsReceivedNote }) => {
    const poObj = typeof item.purchase_order === 'object' ? item.purchase_order as any : null;
    const poNum = poObj?.order_number ?? (item.purchase_order ? `PO-${item.purchase_order}` : null);
    const supplierName = poObj?.supplier_name ?? (typeof poObj?.supplier === 'object' ? poObj?.supplier?.name : null);
    const receiptDate = item.receipt_date
      ? new Date(item.receipt_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
    const itemCount = item.total_items ?? item.items?.length ?? null;

    return (
      <AppCard
        style={styles.receiptCard}
        onPress={() => router.push(`/goods-receiving/${item.id}` as any)}
      >
        {/* GRN code + badge */}
        <View style={styles.topRow}>
          <Text style={[styles.grnNumber, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.grn_number || `GRN-${item.id}`}
          </Text>
          <AppBadge variant={getStatusVariant(item.status)}>
            {statusLabels[item.status] || item.status || 'Unknown'}
          </AppBadge>
        </View>

        {/* Supplier name */}
        {supplierName ? (
          <Text style={[styles.supplierText, { color: colors.textSecondary }]} numberOfLines={2}>
            {supplierName}
          </Text>
        ) : null}

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
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.innerContainer}>
        <AppHeader
          title="Goods Receiving"
          subtitle={data?.count != null ? `${data.count} note${data.count !== 1 ? 's' : ''}` : undefined}
          right={canCreate ? (
            <AppButton
              title="New GRN"
              variant="primary"
              size="sm"
              onPress={() => router.push('/goods-receiving/new' as any)}
            />
          ) : undefined}
        />

        {/* Search & filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Input
                placeholder="Search receipts..."
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
                saveKey="goods-receiving"
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

        {/* Content */}
        {loading && !refreshing ? (
          <AppEmptyState variant="loading" title="Loading receipts..." />
        ) : error && !data?.results?.length ? (
          <AppEmptyState variant="error" title="Failed to load" message={error} actionLabel="Try Again" onAction={loadReceipts} />
        ) : !data?.results?.length ? (
          <AppEmptyState
            variant="empty"
            icon="tray"
            title="No goods receiving notes"
            message="No GRN records found matching your criteria."
          />
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
                  <AppButton
                    title="Previous"
                    variant="secondary"
                    size="sm"
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.previous || page === 1}
                    style={styles.paginationBtn}
                  />
                  <Text style={[styles.paginationText, { color: colors.textMuted }]}>
                    {((page - 1) * 50) + 1}–{Math.min(page * 50, data.count)} of {data.count}
                  </Text>
                  <AppButton
                    title="Next"
                    variant="secondary"
                    size="sm"
                    onPress={() => setPage((p) => p + 1)}
                    disabled={!data.next}
                    style={styles.paginationBtn}
                  />
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchInputWrapper: { flex: 1 },
  searchInput: { marginBottom: 0 },
  filterBtnWrapper: { alignSelf: 'flex-start' },

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
    marginBottom: Spacing.sm,
  },
  grnNumber: { fontSize: 14, fontWeight: '600', flex: 1 },
  supplierText: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.sm },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 3,
  },
  metaLabel: { fontSize: 12, fontWeight: '500', minWidth: 88, flexShrink: 0 },
  metaValue: { fontSize: 13, flex: 1 },

  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  paginationBtn: { minWidth: 80 },
  paginationText: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    flex: 1,
  },
});


export default function GoodsReceivingScreen() {
  return (
    <AppPermissionGate category="goods_receiving" action="view">
      <GoodsReceivingScreenInner />
    </AppPermissionGate>
  );
}
