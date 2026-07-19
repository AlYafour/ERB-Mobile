import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';
import { useCancellableFetch } from '@/lib/hooks/use-cancellable-fetch';
import { productsApi } from '@/lib/api/products';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast } from '@/lib/hooks/use-toast';
import { ListSearchBar } from '@/components/ui/ListSearchBar';
import { FilterField } from '@/components/ui/FilterPanel';
import FilterTags from '@/components/ui/FilterTags';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { DocumentIconTile } from '@/components/ui/DocumentIconTile';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppPagination } from '@/components/ui/AppPagination';
import { Product, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { AppPermissionGate } from '@/components/AppPermissionGate';

/**
 * Memoized list row — re-renders only when its item or theme changes, not on
 * every parent state change (pagination, filters, loading flags).
 */
const ProductCard = React.memo(function ProductCard({
  item,
  colors,
  onOpen,
}: {
  item: Product;
  colors: typeof Colors.light | typeof Colors.dark;
  onOpen: (id: number) => void;
}) {
  const itemId   = Number(item.id);
  const isActive = (item as any).is_active;
  const code     = (item as any).code || item.sku || null;
  const category = item.category || null;
  const unit     = item.unit || null;
  const price    = item.unit_price != null ? `AED ${Number(item.unit_price).toFixed(2)}` : null;
  const stock    = (item as any).stock_balance != null
    ? `${(item as any).stock_balance} ${unit || ''}`.trim()
    : null;
  const trackStock = (item as any).track_stock ?? false;

  return (
    <AppCard style={styles.itemCard} onPress={() => onOpen(itemId)}>
      {/* Icon + name + active badge */}
      <View style={styles.topRow}>
        <DocumentIconTile type="product" />
        <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={2}>{item.name || 'Unnamed Product'}</Text>
        {isActive !== undefined ? (
          <AppBadge variant={isActive ? 'success' : 'danger'}>
            {isActive ? 'Active' : 'Inactive'}
          </AppBadge>
        ) : null}
      </View>

      {/* Meta rows */}
      {code ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{item.sku ? 'SKU' : 'Code'}</Text>
          <Text style={[styles.metaValue, { color: colors.primary }]}>{code}</Text>
        </View>
      ) : null}
      {category ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Category</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>{category}</Text>
        </View>
      ) : null}
      {unit ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Unit</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{unit}</Text>
        </View>
      ) : null}
      {price ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Unit Price</Text>
          <Text style={[styles.metaValue, { color: colors.success, fontWeight: '600' }]}>{price}</Text>
        </View>
      ) : null}
      {trackStock && stock ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Stock</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{stock}</Text>
        </View>
      ) : null}
    </AppCard>
  );
});

function ProductsScreenInner() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null);
  // initialLoading fills the screen once; listLoading (pagination / filter /
  // search reloads) keeps the list AND its pagination footer mounted.
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperuser = user?.is_superuser ?? false;
  const canCreate = isSuperuser || (hasPermission('product', 'create') ?? false);

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

  const loadProducts = useCallback(async () => {
    const { seq } = nextSignal();
    setError(null);
    if (hasLoadedOnce.current) setListLoading(true);
    try {
      const response = await productsApi.getAll({
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
      setError(err.message || 'Failed to load products');
      toast(err.message || 'Failed to load products', 'error');
    } finally {
      if (isCurrent(seq) && mountedRef.current) {
        setInitialLoading(false);
        setListLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, debouncedSearch, filters, nextSignal, isCurrent, mountedRef]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const onRefresh = () => { setRefreshing(true); loadProducts(); };

  const filterFields: FilterField[] = [
    { name: 'code',     label: 'Code',     type: 'text', group: 'Basic Info' },
    { name: 'sku',      label: 'SKU',      type: 'text', group: 'Basic Info' },
    { name: 'category', label: 'Category', type: 'text', group: 'Basic Info' },
    { name: 'brand',    label: 'Brand',    type: 'text', group: 'Basic Info' },
    { name: 'unit',     label: 'Unit',     type: 'text', group: 'Basic Info' },
    {
      name: 'is_active', label: 'Status', type: 'select', group: 'Status',
      options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
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
  useRefetchOnFocus(loadProducts);

  const openProduct = useCallback(
    (id: number) => router.push(`/products/${id}` as any),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard item={item} colors={C} onOpen={openProduct} />
    ),
    [C, openProduct],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <AppHeader
          title="Products"
          subtitle={data?.count != null ? `${data.count} product${data.count !== 1 ? 's' : ''}` : undefined}
          showBack
          right={canCreate ? (
            <AppButton
              title="New Product"
              variant="primary"
              size="sm"
              onPress={() => router.push('/products/new' as any)}
            />
          ) : undefined}
        />

        {/* Search + filter */}
        <ListSearchBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search products..."
          filterFields={filterFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFilterReset={handleFilterReset}
          filterSaveKey="products"
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
          <AppEmptyState variant="loading" title="Loading products..." />
        ) : error && !data?.results?.length ? (
          <AppErrorState title="Failed to load" message={error} onRetry={loadProducts} />
        ) : !data?.results?.length && !listLoading ? (
          <AppEmptyState variant="empty" icon="cube.box" title="No products" message="No products found matching your criteria." />
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
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  itemName: { fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 3,
  },
  metaLabel: { fontSize: 12, fontWeight: '500', minWidth: 72, flexShrink: 0 },
  metaValue: { fontSize: 13, flex: 1 },

  reloadBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 6,
  },
  reloadText: { fontSize: 12, fontWeight: '500' },
});


export default function ProductsScreen() {
  return (
    <AppPermissionGate category="product" action="view">
      <ProductsScreenInner />
    </AppPermissionGate>
  );
}
