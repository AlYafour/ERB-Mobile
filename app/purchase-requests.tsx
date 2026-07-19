import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { projectsApi } from '@/lib/api/projects';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppSkeletonList } from '@/components/ui/AppSkeleton';
import { AppPagination } from '@/components/ui/AppPagination';
import { AppCard } from '@/components/ui/AppCard';
import { DocumentIconTile } from '@/components/ui/DocumentIconTile';
import { ListSearchBar } from '@/components/ui/ListSearchBar';
import { FilterField } from '@/components/ui/FilterPanel';
import FilterTags from '@/components/ui/FilterTags';
import { PurchaseRequest, Project, PaginatedResponse } from '@/types';
import { getDateAccent } from '@/lib/utils/list-helpers';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';

const statusLabels: Record<string, string> = {
  pending:  'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function getStatusVariant(status?: string): 'success' | 'danger' | 'warning' | 'info' {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    case 'pending':  return 'warning';
    default:         return 'info';
  }
}

/**
 * Memoized list row — re-renders only when its item or theme changes, not on
 * every parent state change (pagination, filters, loading flags).
 */
const PRCard = React.memo(function PRCard({
  item,
  colors,
  onOpen,
}: {
  item: PurchaseRequest;
  colors: typeof Colors.light | typeof Colors.dark;
  onOpen: (id: number) => void;
}) {
  const itemId      = Number(item.id);
  const projectName = typeof item.project === 'object' ? item.project?.name : item.project_code || '-';
  const projectCode = typeof item.project === 'object' ? item.project?.code : item.project_code || '';
  const reqDate = item.request_date
    ? new Date(item.request_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const reqByRaw: string | undefined = item.required_by;
  const reqByDate  = reqByRaw ? new Date(reqByRaw) : null;
  const reqBy      = reqByDate ? reqByDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  const { overdue: isOverdue, urgent: isUrgent } = getDateAccent(reqByRaw);
  const reqByColor = isOverdue ? colors.danger : isUrgent ? colors.warning : colors.textPrimary;
  const itemCount  = item.items?.length ?? null;
  const accentColor = isOverdue ? colors.danger : isUrgent ? colors.warning : undefined;

  return (
    <AppCard
      style={[styles.itemCard, accentColor && { borderLeftWidth: 3, borderLeftColor: accentColor }]}
      onPress={() => onOpen(itemId)}
    >
      <View style={styles.itemTopRow}>
        <DocumentIconTile type="purchase_request" />
        <View style={styles.itemTitleCol}>
          <Text style={[styles.itemCode, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.code || `PR-${String(item.id).slice(0, 8)}`}
          </Text>
          {item.title ? (
            <Text style={[styles.itemTitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.title}
            </Text>
          ) : null}
        </View>
        <AppBadge variant={getStatusVariant(item.status)}>
          {statusLabels[item.status || ''] || item.status || 'Unknown'}
        </AppBadge>
      </View>

      {(projectName || projectCode) ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Project</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>
            {projectName}{projectCode ? ` · ${projectCode}` : ''}
          </Text>
        </View>
      ) : null}
      {item.created_by_name ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Requester</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.created_by_name}
          </Text>
        </View>
      ) : null}
      {reqDate ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Request Date</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{reqDate}</Text>
        </View>
      ) : null}
      {reqBy ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Required By</Text>
          <Text style={[styles.metaValue, { color: reqByColor, fontWeight: isOverdue || isUrgent ? '600' : '400' }]}>
            {reqBy}{isOverdue ? ' · Overdue' : isUrgent ? ' · Soon' : ''}
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
});

function PurchaseRequestsScreenInner() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<PurchaseRequest> | null>(null);
  // initialLoading fills the screen once; listLoading (pagination / filter /
  // search reloads) keeps the list AND its pagination footer mounted.
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectsData, setProjectsData] = useState<Project[]>([]);

  const canCreate = hasPermission('purchase_request', 'create');

  // Stale-response guards: an older response never overwrites a newer one,
  // superseded requests are aborted, and nothing sets state after unmount.
  const reqSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll({ page: 1, page_size: 1000, is_active: true });
      if (mountedRef.current) setProjectsData(response.results || []);
    } catch {}
  };

  const loadRequests = useCallback(async () => {
    const seq = ++reqSeq.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    if (hasLoadedOnce.current) setListLoading(true);
    try {
      const response = await purchaseRequestsApi.getAll(
        { page, page_size: 50, search: debouncedSearch, ...filters },
        { signal: controller.signal },
      );
      if (seq !== reqSeq.current || !mountedRef.current) return;
      setData(response);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      if (seq !== reqSeq.current || !mountedRef.current || controller.signal.aborted) return;
      setError(err.message || 'Failed to load purchase requests');
      toast(err.message || 'Failed to load purchase requests', 'error');
    } finally {
      if (seq === reqSeq.current && mountedRef.current) {
        setInitialLoading(false);
        setListLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, debouncedSearch, filters]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // Stale-list fix: refetch when the screen regains focus (create/detail flows)
  useRefetchOnFocus(loadRequests);

  const onRefresh = () => { setRefreshing(true); loadRequests(); };

  const filterFields: FilterField[] = [
    { name: 'code',  label: 'Code',  type: 'text', group: 'Request Info' },
    { name: 'title', label: 'Title', type: 'text', group: 'Request Info' },
    {
      name: 'project', label: 'Project', type: 'select', group: 'Request Info',
      options: projectsData.map((p) => ({ value: Number(p.id), label: `${p.name} (${p.code || ''})` })),
    },
    { name: 'project_code', label: 'Project Code', type: 'text', group: 'Request Info' },
    {
      name: 'status', label: 'Status', type: 'select', group: 'Status',
      options: [
        { value: 'pending',  label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
    },
    { name: 'request_date_after',  label: 'Request Date From', type: 'date', group: 'Dates' },
    { name: 'request_date_before', label: 'Request Date To',   type: 'date', group: 'Dates' },
    { name: 'required_by_after',   label: 'Required By From',  type: 'date', group: 'Dates' },
    { name: 'required_by_before',  label: 'Required By To',    type: 'date', group: 'Dates' },
  ];

  const handleFilterChange = (f: Record<string, any>) => { setFilters(f); setPage(1); };
  const handleFilterReset  = () => { setFilters({}); setPage(1); };
  const handleRemoveFilter = (key: string) => {
    const f = { ...filters }; delete f[key]; setFilters(f); setPage(1);
  };

  const openRequest = useCallback(
    (id: number) => router.push(`/purchase-requests/${id}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: PurchaseRequest }) => (
      <PRCard item={item} colors={colors} onOpen={openRequest} />
    ),
    [colors, openRequest],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.innerContainer}>
        <AppHeader
          title="Purchase Requests"
          subtitle={data?.count != null ? `${data.count} request${data.count !== 1 ? 's' : ''}` : undefined}
          showBack
          right={canCreate ? (
            <AppButton title="New PR" variant="primary" size="sm"
              onPress={() => router.push('/purchase-requests/new')} />
          ) : undefined}
        />

        <ListSearchBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by code or title..."
          filterFields={filterFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFilterReset={handleFilterReset}
          filterSaveKey="purchase-requests"
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
          <AppSkeletonList count={5} lines={4} />
        ) : error && !data?.results?.length ? (
          <AppErrorState title="Failed to load" message={error} onRetry={loadRequests} />
        ) : !data?.results?.length && !listLoading ? (
          <AppEmptyState variant="empty" icon="doc.text" title="No purchase requests" message="No requests found. Create one to get started." />
        ) : (
          <View style={{ flex: 1 }}>
            {/* Slim reload bar — the list and its pagination stay mounted */}
            {listLoading && !refreshing ? (
              <View style={[styles.reloadBar, { backgroundColor: colors.surfaceSoft }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.reloadText, { color: colors.textMuted }]}>Updating…</Text>
              </View>
            ) : null}
            <FlashList
              data={data?.results ?? []}
              renderItem={renderItem}
              keyExtractor={(item, index) => String(item.id ?? index)}
              contentContainerStyle={styles.listContent}
              style={listLoading ? { opacity: 0.6 } : undefined}
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
  container:      { flex: 1 },
  innerContainer: { flex: 1 },

  listContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  itemCard: { marginBottom: Spacing.sm },

  itemTopRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.md,
  },
  itemTitleCol: { flex: 1, gap: 2 },
  itemCode: { fontSize: 14, fontWeight: '600' },

  itemTitle: { fontSize: 13, lineHeight: 18 },

  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, paddingVertical: 3,
  },
  metaLabel: { fontSize: 12, fontWeight: '500', width: 92, flexShrink: 0 },
  metaValue: { fontSize: 13, flex: 1 },

  reloadBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 6,
  },
  reloadText: { fontSize: 12, fontWeight: '500' },
});


export default function PurchaseRequestsScreen() {
  return (
    <AppPermissionGate category="purchase_request" action="view">
      <PurchaseRequestsScreenInner />
    </AppPermissionGate>
  );
}
