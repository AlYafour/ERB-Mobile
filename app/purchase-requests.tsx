import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { projectsApi } from '@/lib/api/projects';
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
import { PurchaseRequest, Project, PaginatedResponse } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function PurchaseRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState<'page' | 'all' | null>(null);
  const [data, setData] = useState<PaginatedResponse<PurchaseRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Permission checks - Superuser has all permissions (matching web app exactly)
  const isSuperuser = user?.is_superuser ?? false;
  const isAdmin = user?.role === 'super_admin' || user?.is_staff;
  const canCreate = isSuperuser || (hasPermission('purchase_request', 'create') ?? false);
  const canView = isSuperuser || (hasPermission('purchase_request', 'view') ?? false);
  const canUpdate = isSuperuser || (hasPermission('purchase_request', 'update') ?? false);
  const canDelete = isSuperuser;
  const canApprove =
    isSuperuser ||
    ((hasPermission('purchase_request', 'approve') ?? false) &&
      user?.role !== 'procurement_officer' &&
      user?.role !== 'site_engineer');
  const canReject =
    isSuperuser ||
    ((hasPermission('purchase_request', 'reject') ?? false) &&
      user?.role !== 'procurement_officer' &&
      user?.role !== 'site_engineer');

  const [projectsData, setProjectsData] = useState<Project[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [page, search, filters]);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll({ page: 1, page_size: 1000, is_active: true });
      setProjectsData(response.results || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await purchaseRequestsApi.getAll({
        page,
        page_size: 50,
        search,
        ...filters,
      });
      setData(response);
    } catch (error: any) {
      console.error('Error loading purchase requests:', error);
      toast(error.message || 'Failed to load purchase requests', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const filterFields: FilterField[] = [
    { name: 'code', label: 'Code', type: 'text', group: 'Request Info' },
    { name: 'title', label: 'Title', type: 'text', group: 'Request Info' },
    {
      name: 'project',
      label: 'Project',
      type: 'select',
      group: 'Request Info',
      options:
        projectsData?.map((p) => ({
          value: Number(p.id),
          label: `${p.name} (${(p as any).code || ''})`,
        })) || [],
    },
    { name: 'project_code', label: 'Project Code', type: 'text', group: 'Request Info' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      group: 'Status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
    },
    { name: 'request_date_after', label: 'Request Date From', type: 'date', group: 'Dates' },
    { name: 'request_date_before', label: 'Request Date To', type: 'date', group: 'Dates' },
    { name: 'required_by_after', label: 'Required By From', type: 'date', group: 'Dates' },
    { name: 'required_by_before', label: 'Required By To', type: 'date', group: 'Dates' },
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
    const confirmed = await confirm('Are you sure you want to approve this request?');
    if (!confirmed) return;

    try {
      setApproving(id);
      await purchaseRequestsApi.approve(id);
      toast('Request approved successfully', 'success');
      loadRequests();
    } catch (error: any) {
      toast(error.message || 'Failed to approve request', 'error');
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
      await purchaseRequestsApi.reject(rejectingId, reason);
      toast('Request rejected', 'info');
      setRejectDialogOpen(false);
      setRejectingId(null);
      loadRequests();
    } catch (error: any) {
      const message = error?.response?.data?.error || error.message || 'Failed to reject request';
      toast(message, 'error');
    } finally {
      setRejecting(null);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm('Are you sure you want to delete this request?');
    if (!confirmed) return;

    try {
      setDeleting(id);
      await purchaseRequestsApi.delete(id);
      toast('Request deleted successfully', 'success');
      loadRequests();
    } catch (error: any) {
      toast(error.message || 'Failed to delete request', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      if (selectMode === null) {
        setSelectMode('page');
      }
      if (selectMode === 'page' && data?.results) {
        setSelectedItems(new Set(data.results.map((r) => Number(r.id))));
      } else if (selectMode === 'all' && data) {
        // For 'all' mode, we'd need to fetch all IDs - simplified for now
        setSelectedItems(new Set(data.results.map((r) => Number(r.id))));
      }
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
    const confirmed = await confirm(`Are you sure you want to delete ${selectedItems.size} request(s)?`);
    if (!confirmed) return;

    try {
      setBulkDeleting(true);
      await Promise.all(Array.from(selectedItems).map((id) => purchaseRequestsApi.delete(id)));
      toast(`${selectedItems.size} request(s) deleted successfully`, 'success');
      setSelectedItems(new Set());
      loadRequests();
    } catch (error: any) {
      toast(error.message || 'Failed to delete some requests', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const currentPageIds = data?.results?.map((r) => Number(r.id)) || [];
  const allPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedItems.has(id));
  const somePageSelected = currentPageIds.some((id) => selectedItems.has(id)) && !allPageSelected;

  const getStatusVariant = (status?: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  };

  const renderItem = ({ item }: { item: PurchaseRequest }) => {
    const itemId = Number(item.id);
    const isSelected = selectedItems.has(itemId);
    const projectName =
      typeof item.project === 'object'
        ? item.project?.name
        : (item as any).project_code || '—';
    const projectCode =
      typeof item.project === 'object' ? (item.project as any)?.code : (item as any).project_code || '';

    return (
      <Card style={StyleSheet.flatten([styles.itemCard, isSelected && styles.itemCardSelected])}>
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => {
            if (selectMode !== null && isAdmin) {
              handleSelectItem(itemId, !isSelected);
            } else {
              router.push(`/purchase-requests/${itemId}` as any);
            }
          }}
          activeOpacity={0.7}>
          <View style={styles.itemHeader}>
            {isAdmin && selectMode !== null && (
              <View style={styles.checkboxContainer}>
                <Checkbox
                  checked={isSelected}
                  onChange={(checked) => {
                    handleSelectItem(itemId, checked);
                    if (checked && selectMode === null) {
                      setSelectMode('page');
                    }
                  }}
                />
              </View>
            )}
            <View style={styles.itemInfo}>
              <ThemedText type="defaultSemiBold" style={styles.itemCode}>
                {(item as any).code || `PR-${String(item.id).slice(0, 8)}`}
              </ThemedText>
              <Badge variant={getStatusVariant(item.status)}>
                {statusLabels[item.status || ''] || item.status || 'Unknown'}
              </Badge>
            </View>
          </View>

          <View style={styles.itemDetails}>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Project:</ThemedText>
              <ThemedText style={styles.detailValue}>{projectName}</ThemedText>
              {projectCode && (
                <ThemedText style={styles.detailValueSecondary}> ({projectCode})</ThemedText>
              )}
            </View>
            {(item as any).title && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Title:</ThemedText>
                <ThemedText style={styles.detailValue} numberOfLines={1}>
                  {(item as any).title}
                </ThemedText>
              </View>
            )}
            {(item as any).created_by_name && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Requester:</ThemedText>
                <ThemedText style={styles.detailValue}>{(item as any).created_by_name}</ThemedText>
              </View>
            )}
            {(item as any).request_date && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Request Date:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {new Date((item as any).request_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </ThemedText>
              </View>
            )}
            {(item as any).required_by && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Required By:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {new Date((item as any).required_by).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </ThemedText>
              </View>
            )}
          </View>

          {item.status === 'pending' && (canApprove || canReject) && !isSelected && (
            <View style={styles.itemActions}>
              {canApprove && (
                <Button
                  title="Approve"
                  variant="success"
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

          {/* Delete button only shows when item is selected */}
          {isSelected && canDelete && (
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
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)' as any)}
              style={styles.backButton}>
              <IconSymbol name="arrow.left" size={24} color={Colors.light.tint} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <ThemedText type="title" style={styles.headerTitle}>
                Purchase Requests
              </ThemedText>
              <ThemedText style={styles.headerSubtitle}>Manage requests and approvals</ThemedText>
            </View>
          </View>
          <View style={styles.headerActions}>
            {canCreate && (
              <Button
                title="New Request"
                variant="primary"
                onPress={() => router.push('/purchase-requests/new' as any)}
                style={styles.newRequestButton}
              />
            )}
          </View>
        </View>

        {/* Select Mode Row - Only show when in select mode */}
        {isAdmin && (selectedItems.size > 0 || selectMode !== null) && (
          <View style={styles.selectModeRow}>
            <View style={styles.selectModeContainer}>
              <TouchableOpacity
                style={[
                  styles.selectModeToggle,
                  selectMode === 'page' && styles.selectModeToggleActive,
                ]}
                onPress={() => {
                  setSelectMode('page');
                  setSelectedItems(new Set());
                }}>
                <ThemedText
                  style={[
                    styles.selectModeToggleText,
                    selectMode === 'page' && styles.selectModeToggleTextActive,
                  ]}>
                  Page
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectModeToggle,
                  selectMode === 'all' && styles.selectModeToggleActive,
                ]}
                onPress={() => {
                  setSelectMode('all');
                  setSelectedItems(new Set());
                }}>
                <ThemedText
                  style={[
                    styles.selectModeToggleText,
                    selectMode === 'all' && styles.selectModeToggleTextActive,
                  ]}>
                  All
                </ThemedText>
              </TouchableOpacity>
            </View>
            {selectedItems.size > 0 && (
              <Button
                title={bulkDeleting ? 'Deleting...' : `Delete (${selectedItems.size})`}
                variant="danger"
                onPress={handleBulkDelete}
                disabled={bulkDeleting}
                loading={bulkDeleting}
                style={styles.bulkDeleteButton}
              />
            )}
            {selectedItems.size === 0 && selectMode !== null && (
              <TouchableOpacity
                onPress={() => {
                  setSelectMode(null);
                  setSelectedItems(new Set());
                }}
                style={styles.cancelSelectButton}>
                <IconSymbol name="xmark.circle.fill" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Input
              placeholder="Search by code or title..."
              value={search}
              onChangeText={setSearch}
              containerStyle={styles.searchInput}
              style={styles.searchInputField}
              leftIcon={<IconSymbol name="magnifyingglass" size={20} color={Colors.light.icon} />}
            />
          </View>
          <View style={styles.filterButtonWrapper}>
            <FilterPanel
              fields={filterFields}
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleFilterReset}
              saveKey="purchase-requests"
            />
          </View>
        </View>
      </View>

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
          <ThemedText style={styles.emptyText}>No purchase requests found</ThemedText>
        </Card>
      ) : (
        <>
          {isAdmin && selectMode !== null && (
            <View style={styles.selectAllContainer}>
              <View style={styles.selectAllContent}>
                <Checkbox
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onChange={handleSelectAll}
                />
                <ThemedText style={styles.selectAllText}>Select All</ThemedText>
              </View>
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
                    Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, data.count)} of {data.count} requests
                    {selectMode === 'all' && selectedItems.size > 0 && (
                      <ThemedText style={styles.selectedCount}> ({selectedItems.size} selected)</ThemedText>
                    )}
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
        title="Reject Purchase Request"
        message="Please provide a reason for rejecting this request. This reason will be saved and visible to the requester."
      />
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
  },
  
  // --- Header Styles ---
  header: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.borderLight,
    backgroundColor: Colors.light.background,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    opacity: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  newRequestButton: {
    minWidth: 120,
  },
  
  // --- Selection Mode Styles ---
  selectModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.borderLight,
    paddingHorizontal: Layout.screenPadding,
  },
  selectModeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.borderLight,
    overflow: 'hidden',
    marginRight: Spacing.xs,
  },
  selectModeToggle: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  selectModeToggleActive: {
    backgroundColor: Colors.light.tint,
  },
  selectModeToggleText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.light.textSecondary,
  },
  selectModeToggleTextActive: {
    color: Colors.light.textInverse,
    fontWeight: Typography.weights.semibold,
  },
  bulkDeleteButton: {
    minWidth: 100,
    paddingHorizontal: Spacing.md,
  },
  cancelSelectButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  
  // --- Search & Filters ---
  searchContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.light.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchInput: {
    marginBottom: 0,
  },
  searchInputField: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontSize: Typography.sizes.base,
  },
  filterButtonWrapper: {
    alignSelf: 'flex-start',
  },
  
  // --- Selection Header ---
  selectAllContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.borderLight,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  selectAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectAllText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  
  // --- List Styles ---
  listContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'] + 80, // Extra space for bottom navigation
  },
  
  // --- Item Card Styles ---
  itemCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.card,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemCardSelected: {
    borderWidth: 2,
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tint + '15',
  },
  itemContent: {
    flex: 1,
  },
  
  // --- Item Header ---
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  checkboxContainer: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  itemCode: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    flex: 1,
    minWidth: '50%',
  },
  
  // --- Item Details ---
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
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.light.textSecondary,
    minWidth: 90,
  },
  detailValue: {
    fontSize: Typography.sizes.sm,
    flex: 1,
    color: Colors.light.text,
  },
  detailValueSecondary: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textTertiary,
  },
  
  // --- Item Actions ---
  itemActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    minHeight: ComponentSizes.button.medium.height,
  },
  
  // --- Loading & Empty States ---
  loadingCard: {
    margin: Layout.screenPadding,
    marginTop: Spacing.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.card,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
  },
  emptyCard: {
    margin: Layout.screenPadding,
    marginTop: Spacing.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.card,
  },
  emptyText: {
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
  },
  
  // --- Pagination ---
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.borderLight,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  paginationButton: {
    minWidth: 90,
    paddingHorizontal: Spacing.md,
  },
  paginationText: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  selectedCount: {
    fontWeight: Typography.weights.semibold,
    color: Colors.light.text,
  },
});

// إضافة ثوابت للظلال
const cardShadow: ViewStyle = {
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
        }
      : {
          shadowColor: Colors.light.shadow,
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }),
};

// إضافة ستايلات ديناميكية للأحجام
const getFontSize = (size: keyof typeof Typography.sizes) => ({
  fontSize: Typography.sizes[size],
});

const getSpacing = (size: keyof typeof Spacing) => ({
  padding: Spacing[size],
});

// دالة للمسافات المتسقة
const spacing = {
  xs: Spacing.xs,
  sm: Spacing.sm,
  md: Spacing.md,
  lg: Spacing.lg,
  xl: Spacing.xl,
} as const;

// إضافة ثوابت للزوايا
const borderRadius = {
  sm: BorderRadius.sm,
  md: BorderRadius.md,
  lg: BorderRadius.lg,
  xl: BorderRadius.xl,
} as const;

// دالة للمسافات المتسقة
const getSpacingStyle = (vertical: keyof typeof Spacing, horizontal: keyof typeof Spacing) => ({
  paddingVertical: Spacing[vertical],
  paddingHorizontal: Spacing[horizontal],
});

// إضافة ستايلات مساعدة
const helperStyles = StyleSheet.create({
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexColumn: {
    flexDirection: 'column',
  },
  flexCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexBetween: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexStart: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  flexEnd: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  textTruncate: {
    overflow: 'hidden',
  },
  textEllipsis: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fullWidth: {
    width: '100%',
  },
  fullHeight: {
    height: '100%',
  },
});

// دالة لدمج الستايلات بطريقة آمنة
const mergeStyles = (...styles: (ViewStyle | TextStyle | undefined)[]): ViewStyle | TextStyle => {
  return StyleSheet.flatten(styles.filter(Boolean) as (ViewStyle | TextStyle)[]);
};

// تصدير الستايلات الإضافية للاستخدام في أماكن أخرى
export const PurchaseRequestStyles = {
  cardShadow,
  getFontSize,
  getSpacing,
  spacing,
  borderRadius,
  getSpacingStyle,
  helperStyles,
  mergeStyles,
};
