import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { productsApi } from '@/lib/api/products';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import FilterTags from '@/components/ui/FilterTags';
import { Product, PaginatedResponse } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';

export default function ProductsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState<'page' | 'all'>('page');
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const isSuperuser = user?.is_superuser ?? false;
  const isAdmin = isSuperuser || user?.role === 'super_admin' || user?.is_staff;
  const canCreate = isSuperuser || (hasPermission('product', 'create') ?? false);
  const canDelete = isSuperuser;

  useEffect(() => {
    loadProducts();
  }, [page, search, filters]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getAll({
        page,
        page_size: 50,
        search,
        ...filters,
      });
      setData(response);
    } catch (error: any) {
      console.error('Error loading products:', error);
      toast(error.message || 'Failed to load products', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const filterFields: FilterField[] = [
    { name: 'name', label: 'Name', type: 'text', group: 'Basic Info' },
    { name: 'code', label: 'Code', type: 'text', group: 'Basic Info' },
    { name: 'sku', label: 'SKU', type: 'text', group: 'Basic Info' },
    { name: 'category', label: 'Category', type: 'text', group: 'Basic Info' },
    { name: 'brand', label: 'Brand', type: 'text', group: 'Basic Info' },
    {
      name: 'is_active',
      label: 'Active Status',
      type: 'boolean',
      group: 'Status',
    },
    {
      name: 'unit_price',
      label: 'Unit Price',
      type: 'range',
      group: 'Pricing',
    },
    { name: 'created_at_after', label: 'Created From', type: 'date', group: 'Dates' },
    { name: 'created_at_before', label: 'Created To', type: 'date', group: 'Dates' },
  ];

  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleFilterReset = () => {
    setFilters({});
    setPage(1);
  };

  const handleRemoveFilter = (key: string) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
    setPage(1);
  };

  const handleClearAllFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handleDelete = async (id: number) => {
    try {
      setDeleting(id);
      await productsApi.delete(id);
      toast('Product deleted successfully', 'success');
      loadProducts();
    } catch (error: any) {
      toast(error.message || 'Failed to delete product', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.results) {
      setSelectedItems(new Set(data.results.map((p) => Number(p.id))));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    try {
      setBulkDeleting(true);
      await Promise.all(Array.from(selectedItems).map((id) => productsApi.delete(id)));
      toast(`${selectedItems.size} product(s) deleted successfully`, 'success');
      setSelectedItems(new Set());
      loadProducts();
    } catch (error: any) {
      toast(error.message || 'Failed to delete some products', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const currentPageIds = data?.results?.map((p) => Number(p.id)) || [];
  const allPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedItems.has(id));
  const somePageSelected = currentPageIds.some((id) => selectedItems.has(id)) && !allPageSelected;

  const renderItem = ({ item }: { item: Product }) => {
    const itemId = Number(item.id);
    const isSelected = selectedItems.has(itemId);

    return (
      <Card style={styles.itemCard}>
        {isAdmin && (
          <View style={styles.checkboxContainer}>
            <Checkbox
              checked={isSelected}
              onChange={(checked) => handleSelectItem(itemId, checked)}
            />
          </View>
        )}
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => router.push(`/products/${itemId}` as any)}
          activeOpacity={0.7}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <ThemedText type="defaultSemiBold" style={styles.itemName}>
                {item.name || 'Unnamed Product'}
              </ThemedText>
              {(item as any).is_active !== undefined && (
                <Badge variant={(item as any).is_active ? 'success' : 'error'}>
                  {(item as any).is_active ? 'Active' : 'Inactive'}
                </Badge>
              )}
            </View>
            {item.unit_price && (
              <ThemedText type="defaultSemiBold" style={styles.itemPrice}>
                ${item.unit_price.toFixed(2)}
              </ThemedText>
            )}
          </View>

          <View style={styles.itemDetails}>
            {item.sku && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>SKU:</ThemedText>
                <ThemedText style={styles.detailValue}>{item.sku}</ThemedText>
              </View>
            )}
            {(item as any).code && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Code:</ThemedText>
                <ThemedText style={styles.detailValue}>{(item as any).code}</ThemedText>
              </View>
            )}
            {item.category && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Category:</ThemedText>
                <ThemedText style={styles.detailValue}>{item.category}</ThemedText>
              </View>
            )}
            {item.description && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Description:</ThemedText>
                <ThemedText style={styles.detailValue} numberOfLines={2}>
                  {item.description}
                </ThemedText>
              </View>
            )}
          </View>

          {canDelete && (
            <View style={styles.itemActions}>
              <Button
                title="Delete"
                variant="danger"
                onPress={() => handleDelete(itemId)}
                disabled={deleting === itemId}
                loading={deleting === itemId}
                style={styles.actionButton}
              />
            </View>
          )}
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ThemedView style={styles.innerContainer}>
        <View style={styles.header}>
        <View>
          <ThemedText type="title" style={styles.headerTitle}>
            Products
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>Manage products and inventory</ThemedText>
        </View>
        <View style={styles.headerActions}>
          {isAdmin && (
            <View style={styles.selectModeContainer}>
              <ThemedText style={styles.selectModeLabel}>Select:</ThemedText>
              <Button
                title="Page"
                variant={selectMode === 'page' ? 'primary' : 'secondary'}
                onPress={() => {
                  setSelectMode('page');
                  setSelectedItems(new Set());
                }}
                style={styles.selectModeButton}
              />
              <Button
                title="All"
                variant={selectMode === 'all' ? 'primary' : 'secondary'}
                onPress={() => {
                  setSelectMode('all');
                  setSelectedItems(new Set());
                }}
                style={styles.selectModeButton}
              />
            </View>
          )}
          {isAdmin && selectedItems.size > 0 && (
            <Button
              title={bulkDeleting ? 'Deleting...' : `Delete ${selectedItems.size}`}
              variant="danger"
              onPress={handleBulkDelete}
              disabled={bulkDeleting}
              loading={bulkDeleting}
              style={styles.bulkDeleteButton}
            />
          )}
          {canCreate && (
            <Button
              title="New Product"
              variant="primary"
              onPress={() => router.push('/products/new' as any)}
            />
          )}
        </View>
      </View>

      <Card style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Input
            placeholder="Search products..."
            value={search}
            onChangeText={setSearch}
            containerStyle={styles.searchInput}
            leftIcon={<IconSymbol name="magnifyingglass" size={20} color={Colors.light.icon} />}
          />
          <FilterPanel
            fields={filterFields}
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleFilterReset}
            saveKey="products"
          />
        </View>
      </Card>

      {Object.keys(filters).length > 0 && (
        <FilterTags
          filters={filters}
          fields={filterFields}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />
      )}

      {loading && !refreshing ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </Card>
      ) : !data || !data.results || data.results.length === 0 ? (
        <Card style={styles.emptyCard}>
          <ThemedText style={styles.emptyText}>No products found</ThemedText>
        </Card>
      ) : (
        <>
          {isAdmin && (
            <View style={styles.selectAllContainer}>
              <Checkbox
                checked={allPageSelected}
                indeterminate={somePageSelected}
                onChange={handleSelectAll}
                title="Select All"
              />
            </View>
          )}
          <FlatList
            data={data.results}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id || Math.random())}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListFooterComponent={
              data && data.count > 50 ? (
                <View style={styles.pagination}>
                  <Button
                    title="Previous"
                    variant="secondary"
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.previous || page === 1}
                    style={styles.paginationButton}
                  />
                  <ThemedText style={styles.paginationText}>
                    Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, data.count)} of {data.count} products
                  </ThemedText>
                  <Button
                    title="Next"
                    variant="secondary"
                    onPress={() => setPage((p) => p + 1)}
                    disabled={!data.next}
                    style={styles.paginationButton}
                  />
                </View>
              ) : null
            }
          />
        </>
      )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md, // SafeAreaView handles Status Bar
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    backgroundColor: Colors.light.background,
  },
  headerTitle: {
    marginBottom: Spacing.xs,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.normal,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  selectModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.light.borderLight,
    marginRight: Spacing.md,
  },
  selectModeLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  selectModeButton: {
    minWidth: 70,
    paddingHorizontal: Spacing.md,
  },
  bulkDeleteButton: {
    minWidth: 110,
  },
  searchCard: {
    marginHorizontal: Layout.screenPadding,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  loadingCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginHorizontal: Layout.screenPadding,
    marginTop: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginHorizontal: Layout.screenPadding,
    marginTop: Spacing.lg,
  },
  emptyText: {
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  selectAllContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  listContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'] + Spacing.lg, // Extra bottom padding for Navigation Bar
  },
  itemCard: {
    marginBottom: Spacing.md,
    padding: Layout.cardPadding,
  },
  checkboxContainer: {
    marginBottom: Spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  itemName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    flex: 1,
    letterSpacing: 0.2,
    color: Colors.light.text,
  },
  itemPrice: {
    fontSize: Typography.sizes.base,
    color: Colors.light.success,
    fontWeight: Typography.weights.semibold,
  },
  itemDetails: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.light.textSecondary,
  },
  detailValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.normal,
    color: Colors.light.text,
  },
  itemActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'] + Spacing.lg, // Extra bottom padding for Navigation Bar
    gap: Spacing.md,
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  paginationButton: {
    minWidth: 90,
  },
  paginationText: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    flex: 1,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },
});
