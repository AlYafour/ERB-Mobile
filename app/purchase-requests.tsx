import { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { ScreenHeader } from '@/components/ui/ScreenHeader';
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
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
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
              <Text style={[styles.itemCode, { color: colors.text }]}>
                {(item as any).code || `PR-${String(item.id).slice(0, 8)}`}
              </Text>
              <Badge variant={getStatusVariant(item.status)}>
                {statusLabels[item.status || ''] || item.status || 'Unknown'}
              </Badge>
            </View>
          </View>

          <View style={styles.itemDetails}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Project:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{projectName}</Text>
              {projectCode && (
                <Text style={[styles.detailValueSecondary, { color: colors.textTertiary }]}> ({projectCode})</Text>
              )}
            </View>
            {(item as any).title && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Title:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                  {(item as any).title}
                </Text>
              </View>
            )}
            {(item as any).created_by_name && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Requester:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{(item as any).created_by_name}</Text>
              </View>
            )}
            {(item as any).request_date && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Request Date:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date((item as any).request_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            )}
            {(item as any).required_by && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Required By:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date((item as any).required_by).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.innerContainer}>
        <ScreenHeader
          title="Purchase Requests"
          subtitle="Manage requests and approvals"
          showBack
          rightElement={
            canCreate ? (
              <Button
                title="+ New"
                variant="primary"
                onPress={() => router.push('/purchase-requests/new' as any)}
                style={{ paddingHorizontal: 14, minHeight: 34 }}
              />
            ) : undefined
          }
        />

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
                <Text
                  style={[
                    styles.selectModeToggleText,
                    { color: selectMode === 'page' ? '#FFF' : colors.textSecondary },
                  ]}>
                  Page
                </Text>
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
                <Text
                  style={[
                    styles.selectModeToggleText,
                    { color: selectMode === 'all' ? '#FFF' : colors.textSecondary },
                  ]}>
                  All
                </Text>
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
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.textSecondary} />
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
              leftIcon={<IconSymbol name="magnifyingglass" size={20} color={colors.textTertiary} />}
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
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </Card>
      ) : !data || !data.results || data.results.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No purchase requests found</Text>
        </Card>
      ) : (
        <>
          {isAdmin && selectMode !== null && (
            <View style={[styles.selectAllContainer, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.borderLight }]}>
              <View style={styles.selectAllContent}>
                <Checkbox
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onChange={handleSelectAll}
                />
                <Text style={[styles.selectAllText, { color: colors.text }]}>Select All</Text>
              </View>
            </View>
          )}
          <FlatList
            data={data.results}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id || Math.random())}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.tint}
                colors={[colors.tint]}
              />
            }
            ListFooterComponent={
              data && data.count > 50 ? (
                <View style={[styles.pagination, { backgroundColor: colors.backgroundSecondary, borderTopColor: colors.borderLight }]}>
                  <Button
                    title="Previous"
                    variant="secondary"
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.previous || page === 1}
                    style={styles.paginationButton}
                  />
                  <Text style={[styles.paginationText, { color: colors.textSecondary }]}>
                    {((page - 1) * 50) + 1}–{Math.min(page * 50, data.count)} of {data.count}
                  </Text>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  innerContainer: { flex: 1 },

  // --- Selection Mode Styles ---
  selectModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Layout.screenPadding,
  },
  selectModeContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
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
    backgroundColor: '#F97316',
  },
  selectModeToggleText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  bulkDeleteButton: {
    minWidth: 100,
    paddingHorizontal: Spacing.md,
  },
  cancelSelectButton: {
    padding: Spacing.xs,
  },

  // --- Search & Filters ---
  searchContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchInputWrapper: { flex: 1 },
  searchInput: { marginBottom: 0 },
  searchInputField: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontSize: Typography.sizes.base,
  },
  filterButtonWrapper: { alignSelf: 'flex-start' },

  // --- Selection Header ---
  selectAllContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingBottom: 120,
  },

  // --- Item Card Styles ---
  itemCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  itemCardSelected: {
    borderWidth: 2,
    borderColor: '#F97316',
  },
  itemContent: { flex: 1 },

  // --- Item Header ---
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
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
    minWidth: 90,
  },
  detailValue: {
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  detailValueSecondary: {
    fontSize: Typography.sizes.sm,
  },

  // --- Item Actions ---
  itemActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 38,
  },

  // --- Loading & Empty States ---
  loadingCard: {
    margin: Layout.screenPadding,
    marginTop: Spacing.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
  },
  emptyCard: {
    margin: Layout.screenPadding,
    marginTop: Spacing.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.sizes.base,
  },

  // --- Pagination ---
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  paginationButton: {
    minWidth: 80,
    paddingHorizontal: Spacing.md,
  },
  paginationText: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    flex: 1,
  },
  selectedCount: {
    fontWeight: Typography.weights.semibold,
  },
});
