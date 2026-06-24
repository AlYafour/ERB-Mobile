import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { projectsApi } from '@/lib/api/projects';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppCard } from '@/components/ui/AppCard';
import { Input } from '@/components/ui/Input';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import FilterTags from '@/components/ui/FilterTags';
import { PurchaseRequest, Project, PaginatedResponse } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { useColorScheme } from '@/hooks/use-color-scheme';

const statusLabels: Record<string, string> = {
  pending:  'Pending',
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<PurchaseRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectsData, setProjectsData] = useState<Project[]>([]);

  const isSuperuser = user?.is_superuser ?? false;
  const canCreate = isSuperuser || (hasPermission('purchase_request', 'create') ?? false);

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadRequests(); }, [page, debouncedSearch, filters]);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll({ page: 1, page_size: 1000, is_active: true });
      setProjectsData(response.results || []);
    } catch {}
  };

  const loadRequests = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await purchaseRequestsApi.getAll({ page, page_size: 50, search: debouncedSearch, ...filters });
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load purchase requests');
      toast(err.message || 'Failed to load purchase requests', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadRequests(); };

  const filterFields: FilterField[] = [
    { name: 'code',  label: 'Code',  type: 'text', group: 'Request Info' },
    { name: 'title', label: 'Title', type: 'text', group: 'Request Info' },
    {
      name: 'project', label: 'Project', type: 'select', group: 'Request Info',
      options: projectsData.map((p) => ({ value: Number(p.id), label: `${p.name} (${(p as any).code || ''})` })),
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

  const getStatusVariant = (status?: string): 'success' | 'danger' | 'warning' | 'info' => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'pending':  return 'warning';
      default:         return 'info';
    }
  };

  const renderItem = ({ item }: { item: PurchaseRequest }) => {
    const itemId      = Number(item.id);
    const projectName = typeof item.project === 'object' ? item.project?.name : (item as any).project_code || '-';
    const projectCode = typeof item.project === 'object' ? (item.project as any)?.code : (item as any).project_code || '';
    const reqDate = (item as any).request_date
      ? new Date((item as any).request_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
    const reqByRaw: string | undefined = (item as any).required_by;
    const reqByDate  = reqByRaw ? new Date(reqByRaw) : null;
    const reqBy      = reqByDate ? reqByDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    const now        = new Date();
    const twoDaysOut = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const isOverdue  = reqByDate ? reqByDate < now : false;
    const isUrgent   = reqByDate ? reqByDate < twoDaysOut : false;
    const reqByColor = isOverdue ? colors.danger : isUrgent ? colors.warning : colors.textPrimary;
    const itemCount  = item.items?.length ?? null;

    return (
      <AppCard style={styles.itemCard} onPress={() => router.push(`/purchase-requests/${itemId}` as any)}>
        <View style={styles.itemTopRow}>
          <Text style={[styles.itemCode, { color: colors.textPrimary }]} numberOfLines={1}>
            {(item as any).code || `PR-${String(item.id).slice(0, 8)}`}
          </Text>
          <AppBadge variant={getStatusVariant(item.status)}>
            {statusLabels[item.status || ''] || item.status || 'Unknown'}
          </AppBadge>
        </View>

        {(item as any).title ? (
          <Text style={[styles.itemTitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {(item as any).title}
          </Text>
        ) : null}

        {(projectName || projectCode) ? (
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Project</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {projectName}{projectCode ? ` · ${projectCode}` : ''}
            </Text>
          </View>
        ) : null}
        {(item as any).created_by_name ? (
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Requester</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {(item as any).created_by_name}
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
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.innerContainer}>
        <AppHeader
          title="Purchase Requests"
          subtitle={data?.count != null ? `${data.count} request${data.count !== 1 ? 's' : ''}` : undefined}
          showBack
          right={canCreate ? (
            <AppButton title="New PR" variant="primary" size="sm"
              onPress={() => router.push('/purchase-requests/new' as any)} />
          ) : undefined}
        />

        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Input
                placeholder="Search by code or title..."
                value={search}
                onChangeText={setSearch}
                containerStyle={styles.searchInput}
                leftIcon={<IconSymbol name="magnifyingglass" size={20} color={colors.textMuted} />}
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

        {Object.keys(filters).length > 0 && (
          <FilterTags
            filters={filters}
            fields={filterFields}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={() => { setFilters({}); setPage(1); }}
          />
        )}

        {loading && !refreshing ? (
          <AppEmptyState variant="loading" title="Loading requests…" />
        ) : error && !data?.results?.length ? (
          <AppEmptyState variant="error" title="Failed to load" message={error} actionLabel="Try Again" onAction={loadRequests} />
        ) : !data?.results?.length ? (
          <AppEmptyState variant="empty" icon="doc.text" title="No purchase requests" message="No requests found. Create one to get started." />
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
                  <AppButton title="Previous" variant="secondary" size="sm"
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.previous || page === 1} style={styles.paginationButton} />
                  <Text style={[styles.paginationText, { color: colors.textMuted }]}>
                    {((page - 1) * 50) + 1}–{Math.min(page * 50, data.count)} of {data.count}
                  </Text>
                  <AppButton title="Next" variant="secondary" size="sm"
                    onPress={() => setPage((p) => p + 1)}
                    disabled={!data.next} style={styles.paginationButton} />
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
  container:      { flex: 1 },
  innerContainer: { flex: 1 },

  searchContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchRow:           { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchInputWrapper:  { flex: 1 },
  searchInput:         { marginBottom: 0 },
  filterButtonWrapper: { alignSelf: 'flex-start' },

  listContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  itemCard: { marginBottom: Spacing.sm },

  itemTopRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  itemCode: { fontSize: 14, fontWeight: '600', flex: 1 },

  itemTitle: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.sm },

  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, paddingVertical: 3,
  },
  metaLabel: { fontSize: 12, fontWeight: '500', width: 92, flexShrink: 0 },
  metaValue: { fontSize: 13, flex: 1 },

  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    gap: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth,
  },
  paginationButton: { minWidth: 80 },
  paginationText:   { fontSize: Typography.sizes.sm, textAlign: 'center', flex: 1 },
});
