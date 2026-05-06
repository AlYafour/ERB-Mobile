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
import { purchaseQuotationsApi } from '@/lib/api/purchase-quotations';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import FilterTags from '@/components/ui/FilterTags';
import { PurchaseQuotation, PaginatedResponse } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { CommonStyles } from '@/constants/common-styles';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  awarded: 'Awarded',
  rejected: 'Rejected',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export default function PurchaseQuotationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState<'page' | 'all'>('page');
  const [data, setData] = useState<PaginatedResponse<PurchaseQuotation> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [awarding, setAwarding] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const isSuperuser = user?.is_superuser ?? false;
  const isAdmin = isSuperuser || user?.role === 'super_admin' || user?.is_staff;
  const canCreate = isSuperuser || (hasPermission('purchase_quotation', 'create') ?? false);
  const canDelete = isSuperuser;
  const canAward = isSuperuser || (hasPermission('purchase_quotation', 'award') ?? false);
  const canReject = isSuperuser || (hasPermission('purchase_quotation', 'reject') ?? false);

  useEffect(() => {
    loadQuotations();
  }, [page, search, filters]);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const response = await purchaseQuotationsApi.getAll({
        page,
        page_size: 50,
        search,
        ...filters,
      });
      setData(response);
    } catch (error: any) {
      console.error('Error loading purchase quotations:', error);
      toast(error.message || 'Failed to load purchase quotations', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadQuotations();
  };

  const filterFields: FilterField[] = [
    { name: 'quotation_number', label: 'Quotation Number', type: 'text', group: 'Quotation Info' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      group: 'Status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'awarded', label: 'Awarded' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'expired', label: 'Expired' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { name: 'quotation_date_after', label: 'Quotation Date From', type: 'date', group: 'Dates' },
    { name: 'quotation_date_before', label: 'Quotation Date To', type: 'date', group: 'Dates' },
    { name: 'valid_until_after', label: 'Valid Until From', type: 'date', group: 'Dates' },
    { name: 'valid_until_before', label: 'Valid Until To', type: 'date', group: 'Dates' },
    {
      name: 'total',
      label: 'Total Amount',
      type: 'range',
      group: 'Amount',
    },
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

  const handleAward = async (id: number) => {
    const confirmed = await confirm('Are you sure you want to award this quotation?');
    if (!confirmed) return;

    try {
      setAwarding(id);
      await purchaseQuotationsApi.award(id);
      toast('Quotation awarded successfully', 'success');
      loadQuotations();
    } catch (error: any) {
      toast(error.message || 'Failed to award quotation', 'error');
    } finally {
      setAwarding(null);
    }
  };

  const handleReject = async (id: number) => {
    const confirmed = await confirm('Are you sure you want to reject this quotation?');
    if (!confirmed) return;

    try {
      setRejecting(id);
      await purchaseQuotationsApi.reject(id);
      toast('Quotation rejected', 'info');
      loadQuotations();
    } catch (error: any) {
      toast(error.message || 'Failed to reject quotation', 'error');
    } finally {
      setRejecting(null);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm('Are you sure you want to delete this quotation?');
    if (!confirmed) return;

    try {
      setDeleting(id);
      await purchaseQuotationsApi.delete(id);
      toast('Quotation deleted successfully', 'success');
      loadQuotations();
    } catch (error: any) {
      toast(error.message || 'Failed to delete quotation', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.results) {
      setSelectedItems(new Set(data.results.map((q) => Number(q.id))));
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
    const confirmed = await confirm(`Are you sure you want to delete ${selectedItems.size} quotation(s)?`);
    if (!confirmed) return;

    try {
      setBulkDeleting(true);
      await Promise.all(Array.from(selectedItems).map((id) => purchaseQuotationsApi.delete(id)));
      toast(`${selectedItems.size} quotation(s) deleted successfully`, 'success');
      setSelectedItems(new Set());
      loadQuotations();
    } catch (error: any) {
      toast(error.message || 'Failed to delete some quotations', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const currentPageIds = data?.results?.map((q) => Number(q.id)) || [];
  const allPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedItems.has(id));
  const somePageSelected = currentPageIds.some((id) => selectedItems.has(id)) && !allPageSelected;

  const getStatusVariant = (status?: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'awarded':
        return 'success';
      case 'rejected':
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'warning';
      case 'expired':
        return 'error';
      default:
        return 'info';
    }
  };

  const renderItem = ({ item }: { item: PurchaseQuotation }) => {
    const itemId = Number(item.id);
    const isSelected = selectedItems.has(itemId);
    const supplierName =
      typeof item.supplier === 'object'
        ? item.supplier?.name
        : (item as any).supplier_name || '—';

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
          onPress={() => router.push(`/purchase-quotations/${itemId}` as any)}
          activeOpacity={0.7}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <ThemedText type="defaultSemiBold" style={styles.itemCode}>
                {(item as any).quotation_number || `PQ-${String(item.id).slice(0, 8)}`}
              </ThemedText>
              <Badge variant={getStatusVariant(item.status)}>
                {statusLabels[item.status || ''] || item.status || 'Unknown'}
              </Badge>
            </View>
          </View>

          <View style={styles.itemDetails}>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Supplier:</ThemedText>
              <ThemedText style={styles.detailValue}>{supplierName}</ThemedText>
            </View>
            {(item as any).quotation_date && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Quotation Date:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {new Date((item as any).quotation_date).toLocaleDateString('en-US')}
                </ThemedText>
              </View>
            )}
            {(item as any).valid_until && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Valid Until:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {new Date((item as any).valid_until).toLocaleDateString('en-US')}
                </ThemedText>
              </View>
            )}
            {(item as any).total && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Total:</ThemedText>
                <ThemedText type="defaultSemiBold" style={[styles.detailValue, { color: '#28a745' }]}>
                  ${((item as any).total || 0).toFixed(2)}
                </ThemedText>
              </View>
            )}
          </View>

          {item.status === 'pending' && (canAward || canReject) && (
            <View style={styles.itemActions}>
              {canAward && (
                <Button
                  title="Award"
                  variant="primary"
                  onPress={() => handleAward(itemId)}
                  disabled={awarding === itemId}
                  loading={awarding === itemId}
                  style={styles.actionButton}
                />
              )}
              {canReject && (
                <Button
                  title="Reject"
                  variant="danger"
                  onPress={() => handleReject(itemId)}
                  disabled={rejecting === itemId}
                  loading={rejecting === itemId}
                  style={styles.actionButton}
                />
              )}
            </View>
          )}

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
            Purchase Quotations
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>Manage supplier quotations</ThemedText>
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
              title="New Quotation"
              variant="primary"
              onPress={() => router.push('/purchase-quotations/new' as any)}
            />
          )}
        </View>
      </View>

      <Card style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Input
            placeholder="Search purchase quotations..."
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
            saveKey="purchase-quotations"
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
          <ThemedText style={styles.emptyText}>No purchase quotations found</ThemedText>
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
                    Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, data.count)} of {data.count} quotations
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
  itemCode: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    flex: 1,
    letterSpacing: 0.2,
    color: Colors.light.text,
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
