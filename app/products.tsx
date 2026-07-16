import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { productsApi } from '@/lib/api/products';
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
import { Product, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { AppPermissionGate } from '@/components/AppPermissionGate';

type AppColors = typeof Colors.light | typeof Colors.dark;

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperuser = user?.is_superuser ?? false;
  const canCreate = isSuperuser || (hasPermission('product', 'create') ?? false);

  // Debounce search 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadProducts(); }, [page, debouncedSearch, filters]);

  const loadProducts = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await productsApi.getAll({
        page,
        page_size: 50,
        search: debouncedSearch,
        ...filters,
      });
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
      toast(err.message || 'Failed to load products', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  const S = makeStyles(C);

  const renderItem = ({ item }: { item: Product }) => {
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
      <AppCard style={S.itemCard} onPress={() => router.push(`/products/${itemId}` as any)}>
        {/* Name + active badge */}
        <View style={S.topRow}>
          <Text style={[S.itemName, { color: C.textPrimary }]} numberOfLines={2}>{item.name || 'Unnamed Product'}</Text>
          {isActive !== undefined ? (
            <AppBadge variant={isActive ? 'success' : 'danger'}>
              {isActive ? 'Active' : 'Inactive'}
            </AppBadge>
          ) : null}
        </View>

        {/* Meta rows */}
        {code ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>{item.sku ? 'SKU' : 'Code'}</Text>
            <Text style={[S.metaValue, { color: C.primary }]}>{code}</Text>
          </View>
        ) : null}
        {category ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Category</Text>
            <Text style={[S.metaValue, { color: C.textPrimary }]} numberOfLines={1}>{category}</Text>
          </View>
        ) : null}
        {unit ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Unit</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]}>{unit}</Text>
          </View>
        ) : null}
        {price ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Unit Price</Text>
            <Text style={[S.metaValue, { color: C.success, fontWeight: '600' }]}>{price}</Text>
          </View>
        ) : null}
        {trackStock && stock ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Stock</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]}>{stock}</Text>
          </View>
        ) : null}
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={[S.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <View style={S.inner}>
        <AppHeader
          title="Products"
          subtitle={data?.count != null ? `${data.count} product${data.count !== 1 ? 's' : ''}` : undefined}
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
        <View style={S.searchContainer}>
          <View style={S.searchRow}>
            <View style={S.searchInputWrapper}>
              <Input
                placeholder="Search products..."
                value={search}
                onChangeText={setSearch}
                containerStyle={S.searchInput}
                leftIcon={<IconSymbol name="magnifyingglass" size={20} color={C.textMuted} />}
              />
            </View>
            <View style={S.filterBtnWrapper}>
              <FilterPanel
                fields={filterFields}
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleFilterReset}
                saveKey="products"
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
          <AppEmptyState variant="loading" title="Loading products..." />
        ) : error && !data?.results?.length ? (
          <AppEmptyState variant="error" title="Failed to load" message={error} actionLabel="Try Again" onAction={loadProducts} />
        ) : !data?.results?.length ? (
          <AppEmptyState variant="empty" icon="cube.box" title="No products" message="No products found matching your criteria." />
        ) : (
          <FlatList
            data={data.results}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id || Math.random())}
            contentContainerStyle={S.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
            }
            ListFooterComponent={
              data && data.count > 50 ? (
                <View style={[S.pagination, { backgroundColor: C.surfaceSoft, borderTopColor: C.border }]}>
                  <AppButton title="Previous" variant="secondary" size="sm"
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.previous || page === 1} style={S.paginationBtn} />
                  <Text style={[S.paginationText, { color: C.textMuted }]}>
                    {((page - 1) * 50) + 1}–{Math.min(page * 50, data.count)} of {data.count}
                  </Text>
                  <AppButton title="Next" variant="secondary" size="sm"
                    onPress={() => setPage((p) => p + 1)}
                    disabled={!data.next} style={S.paginationBtn} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    inner:     { flex: 1 },

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

    pagination: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
      gap: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth,
    },
    paginationBtn: { minWidth: 80 },
    paginationText: { fontSize: Typography.sizes.sm, textAlign: 'center', flex: 1 },
  });
}


export default function ProductsScreen() {
  return (
    <AppPermissionGate category="product" action="view">
      <ProductsScreenInner />
    </AppPermissionGate>
  );
}
