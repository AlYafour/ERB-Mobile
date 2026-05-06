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
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
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
import RejectionReasonDialog from '@/components/ui/RejectionReasonDialog';
import { PurchaseOrder, PaginatedResponse } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { CommonStyles } from '@/constants/common-styles';

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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState<'page' | 'all'>('page');
  const [data, setData] = useState<PaginatedResponse<PurchaseOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const isSuperuser = user?.is_superuser ?? false;
  const isAdmin = isSuperuser || user?.role === 'super_admin' || user?.is_staff;
  const canCreate = isSuperuser || (hasPermission('purchase_order', 'create') ?? false);
  const canDelete = isSuperuser;
  const canApprove = isSuperuser || (hasPermission('purchase_order', 'approve') ?? false);
  const canReject = isSuperuser || (hasPermission('purchase_order', 'reject') ?? false);

  useEffect(() => {
    loadOrders();
  }, [page, search, filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrdersApi.getAll({
        page,
        page_size: 50,
        search,
        ...filters,
      });
      setData(response);
    } catch (error: any) {
      console.error('Error loading purchase orders:', error);
      toast(error.message || 'Failed to load purchase orders', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const filterFields: FilterField[] = [
    { name: 'order_number', label: 'Order Number', type: 'text', group: 'Order Info' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      group: 'Status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { name: 'order_date_after', label: 'Order Date From', type: 'date', group: 'Dates' },
    { name: 'order_date_before', label: 'Order Date To', type: 'date', group: 'Dates' },
    { name: 'delivery_date_after', label: 'Delivery Date From', type: 'date', group: 'Dates' },
    { name: 'delivery_date_before', label: 'Delivery Date To', type: 'date', group: 'Dates' },
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

  const handleApprove = async (id: number) => {
    const confirmed = await confirm('Are you sure you want to approve this order?');
    if (!confirmed) return;

    try {
      setApproving(id);
      await purchaseOrdersApi.approve(id);
      toast('Order approved successfully', 'success');
      loadOrders();
    } catch (error: any) {
      toast(error.message || 'Failed to approve order', 'error');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = (id: number) => {
    setRejectingId(id);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingId) return;

    try {
      setRejecting(rejectingId);
      await purchaseOrdersApi.reject(rejectingId, reason);
      toast('Order rejected', 'info');
      setRejectDialogOpen(false);
      setRejectingId(null);
      loadOrders();
    } catch (error: any) {
      const message = error?.response?.data?.error || error.message || 'Failed to reject order';
      toast(message, 'error');
    } finally {
      setRejecting(null);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm('Are you sure you want to delete this order?');
    if (!confirmed) return;

    try {
      setDeleting(id);
      await purchaseOrdersApi.delete(id);
      toast('Order deleted successfully', 'success');
      loadOrders();
    } catch (error: any) {
      toast(error.message || 'Failed to delete order', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.results) {
      setSelectedItems(new Set(data.results.map((o) => Number(o.id))));
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
    const confirmed = await confirm(`Are you sure you want to delete ${selectedItems.size} order(s)?`);
    if (!confirmed) return;

    try {
      setBulkDeleting(true);
      await Promise.all(Array.from(selectedItems).map((id) => purchaseOrdersApi.delete(id)));
      toast(`${selectedItems.size} order(s) deleted successfully`, 'success');
      setSelectedItems(new Set());
      loadOrders();
    } catch (error: any) {
      toast(error.message || 'Failed to delete some orders', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const currentPageIds = data?.results?.map((o) => Number(o.id)) || [];
  const allPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedItems.has(id));
  const somePageSelected = currentPageIds.some((id) => selectedItems.has(id)) && !allPageSelected;

  const getStatusVariant = (status?: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'success';
      case 'rejected':
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  };

  const renderItem = ({ item }: { item: PurchaseOrder }) => {
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
          onPress={() => router.push(`/purchase-orders/${itemId}` as any)}
          activeOpacity={0.7}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <ThemedText type="defaultSemiBold" style={styles.itemCode}>
                {(item as any).order_number || `PO-${String(item.id).slice(0, 8)}`}
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
            {(item as any).order_date && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Order Date:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {new Date((item as any).order_date).toLocaleDateString('en-US')}
                </ThemedText>
              </View>
            )}
            {(item as any).delivery_date && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Delivery Date:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {new Date((item as any).delivery_date).toLocaleDateString('en-US')}
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

          {item.status === 'pending' && (canApprove || canReject) && (
            <View style={styles.itemActions}>
              {canApprove && (
                <Button
                  title="Approve"
                  variant="primary"
                  onPress={() => handleApprove(itemId)}
                  disabled={approving === itemId}
                  loading={approving === itemId}
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
            Purchase Orders
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>Manage purchase orders and approvals</ThemedText>
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
              title="New Order"
              variant="primary"
              onPress={() => router.push('/purchase-orders/new' as any)}
            />
          )}
        </View>
      </View>

      <Card style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Input
            placeholder="Search purchase orders..."
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
            saveKey="purchase-orders"
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
          <ThemedText style={styles.emptyText}>No purchase orders found</ThemedText>
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
                    Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, data.count)} of {data.count} orders
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

      <RejectionReasonDialog
        isOpen={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false);
          setRejectingId(null);
        }}
        onConfirm={handleRejectConfirm}
        title="Reject Purchase Order"
        message="Please provide a reason for rejecting this order. This reason will be saved and visible to the requester."
      />
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
