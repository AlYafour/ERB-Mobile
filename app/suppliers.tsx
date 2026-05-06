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
import { suppliersApi } from '@/lib/api/suppliers';
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
import { Supplier, PaginatedResponse } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { CommonStyles } from '@/constants/common-styles';

export default function SuppliersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState<'page' | 'all'>('page');
  const [data, setData] = useState<PaginatedResponse<Supplier> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const isSuperuser = user?.is_superuser ?? false;
  const isAdmin = isSuperuser || user?.role === 'super_admin' || user?.is_staff;
  const canCreate = isSuperuser || (hasPermission('supplier', 'create') ?? false);
  const canView = isSuperuser || (hasPermission('supplier', 'view') ?? false);
  const canUpdate = isSuperuser || (hasPermission('supplier', 'update') ?? false);
  const canDelete = isSuperuser;

  useEffect(() => {
    loadSuppliers();
  }, [page, search, filters]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await suppliersApi.getAll({
        page,
        page_size: 50,
        search,
        ...filters,
      });
      setData(response);
    } catch (error: any) {
      console.error('Error loading suppliers:', error);
      toast(error.message || 'Failed to load suppliers', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSuppliers();
  };

  const filterFields: FilterField[] = [
    { name: 'name', label: 'Name', type: 'text', group: 'Basic Info' },
    { name: 'business_name', label: 'Business Name', type: 'text', group: 'Basic Info' },
    { name: 'supplier_number', label: 'Supplier Number', type: 'text', group: 'Basic Info' },
    { name: 'contact_person', label: 'Contact Person', type: 'text', group: 'Contact' },
    { name: 'email', label: 'Email', type: 'text', group: 'Contact' },
    { name: 'phone', label: 'Phone', type: 'text', group: 'Contact' },
    { name: 'city', label: 'City', type: 'text', group: 'Location' },
    { name: 'state', label: 'State', type: 'text', group: 'Location' },
    { name: 'country', label: 'Country', type: 'text', group: 'Location' },
    {
      name: 'is_active',
      label: 'Active Status',
      type: 'boolean',
      group: 'Status',
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
      await suppliersApi.delete(id);
      toast('Supplier deleted successfully', 'success');
      loadSuppliers();
    } catch (error: any) {
      toast(error.message || 'Failed to delete supplier', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.results) {
      setSelectedItems(new Set(data.results.map((s) => Number(s.id))));
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
      await Promise.all(Array.from(selectedItems).map((id) => suppliersApi.delete(id)));
      toast(`${selectedItems.size} supplier(s) deleted successfully`, 'success');
      setSelectedItems(new Set());
      loadSuppliers();
    } catch (error: any) {
      toast(error.message || 'Failed to delete some suppliers', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const currentPageIds = data?.results?.map((s) => Number(s.id)) || [];
  const allPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedItems.has(id));
  const somePageSelected = currentPageIds.some((id) => selectedItems.has(id)) && !allPageSelected;

  const renderItem = ({ item }: { item: Supplier }) => {
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
          onPress={() => router.push(`/suppliers/${itemId}` as any)}
          activeOpacity={0.7}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <ThemedText type="defaultSemiBold" style={styles.itemName}>
                {item.name || (item as any).business_name || 'Unnamed Supplier'}
              </ThemedText>
              {(item as any).is_active !== undefined && (
                <Badge variant={(item as any).is_active ? 'success' : 'error'}>
                  {(item as any).is_active ? 'Active' : 'Inactive'}
                </Badge>
              )}
            </View>
          </View>

          <View style={styles.itemDetails}>
            {(item as any).supplier_number && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Number:</ThemedText>
                <ThemedText style={styles.detailValue}>{(item as any).supplier_number}</ThemedText>
              </View>
            )}
            {item.contact_person && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Contact:</ThemedText>
                <ThemedText style={styles.detailValue}>{item.contact_person}</ThemedText>
              </View>
            )}
            {item.email && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Email:</ThemedText>
                <ThemedText style={styles.detailValue}>{item.email}</ThemedText>
              </View>
            )}
            {item.phone && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Phone:</ThemedText>
                <ThemedText style={styles.detailValue}>{item.phone}</ThemedText>
              </View>
            )}
            {item.address && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Address:</ThemedText>
                <ThemedText style={styles.detailValue} numberOfLines={2}>
                  {item.address}
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
        {/* Header */}
        <View style={styles.header}>
        <View>
          <ThemedText type="title" style={styles.headerTitle}>
            Suppliers
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>Manage suppliers and vendor information</ThemedText>
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
              title="New Supplier"
              variant="primary"
              onPress={() => router.push('/suppliers/new' as any)}
            />
          )}
        </View>
      </View>

      {/* Search and Filters */}
      <Card style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Input
            placeholder="Search suppliers..."
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
            saveKey="suppliers"
          />
        </View>
      </Card>

      {/* Filter Tags */}
      {Object.keys(filters).length > 0 && (
        <FilterTags
          filters={filters}
          fields={filterFields}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />
      )}

      {/* Content */}
      {loading && !refreshing ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </Card>
      ) : !data || !data.results || data.results.length === 0 ? (
        <Card style={styles.emptyCard}>
          <ThemedText style={styles.emptyText}>No suppliers found</ThemedText>
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
                    Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, data.count)} of {data.count} suppliers
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
  ...CommonStyles,
  container: {
    ...CommonStyles.screenContainer,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    ...CommonStyles.header,
  },
  headerTitle: {
    ...CommonStyles.headerTitle,
  },
  headerSubtitle: {
    ...CommonStyles.headerSubtitle,
  },
  headerActions: {
    ...CommonStyles.headerActions,
  },
  selectModeContainer: {
    ...CommonStyles.selectModeContainer,
  },
  selectModeLabel: {
    ...CommonStyles.selectModeLabel,
  },
  selectModeButton: {
    ...CommonStyles.selectModeButton,
  },
  bulkDeleteButton: {
    ...CommonStyles.bulkDeleteButton,
  },
  searchCard: {
    ...CommonStyles.searchCard,
  },
  searchRow: {
    ...CommonStyles.searchRow,
  },
  searchInput: {
    ...CommonStyles.searchInput,
  },
  loadingCard: {
    ...CommonStyles.loadingCard,
  },
  loadingText: {
    ...CommonStyles.loadingText,
  },
  emptyCard: {
    ...CommonStyles.emptyCard,
  },
  emptyText: {
    ...CommonStyles.emptyText,
  },
  selectAllContainer: {
    ...CommonStyles.selectAllContainer,
  },
  listContent: {
    ...CommonStyles.listContent,
  },
  itemCard: {
    ...CommonStyles.itemCard,
  },
  checkboxContainer: {
    marginBottom: Spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    marginBottom: Spacing.md,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  itemName: {
    ...CommonStyles.itemName,
  },
  itemDetails: {
    ...CommonStyles.itemDetails,
  },
  detailRow: {
    ...CommonStyles.detailRow,
  },
  detailLabel: {
    ...CommonStyles.detailLabel,
  },
  detailValue: {
    ...CommonStyles.detailValue,
  },
  itemActions: {
    ...CommonStyles.itemActions,
  },
  actionButton: {
    ...CommonStyles.actionButton,
  },
  pagination: {
    ...CommonStyles.pagination,
  },
  paginationButton: {
    ...CommonStyles.paginationButton,
  },
  paginationText: {
    ...CommonStyles.paginationText,
  },
});
