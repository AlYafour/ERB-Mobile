import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';
import { useCancellableFetch } from '@/lib/hooks/use-cancellable-fetch';
import { projectsApi } from '@/lib/api/projects';
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
import { Project, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { AppPermissionGate } from '@/components/AppPermissionGate';

const statusLabels: Record<string, string> = {
  active:    'Active',
  completed: 'Completed',
  on_hold:   'On Hold',
  inactive:  'Inactive',
};

function getStatusVariant(s?: string): 'success' | 'danger' | 'warning' | 'info' | 'default' {
  switch (s) {
    case 'active':    return 'success';
    case 'completed': return 'info';
    case 'on_hold':   return 'warning';
    case 'inactive':  return 'danger';
    default:          return 'default';
  }
}

/**
 * Memoized list row — re-renders only when its item or theme changes, not on
 * every parent state change (pagination, filters, loading flags).
 */
const ProjectCard = React.memo(function ProjectCard({
  item,
  colors,
  onOpen,
}: {
  item: Project;
  colors: typeof Colors.light | typeof Colors.dark;
  onOpen: (id: number) => void;
}) {
  const itemId = Number(item.id);

  const code           = item.code || null;
  const status         = item.project_status || item.status || null;
  const location       = item.location || null;
  const contactPerson  = item.contact_person || null;
  const mobileNumber   = item.mobile_number || null;
  const sector         = item.sector || null;
  const officeLocation = item.office_location_detail?.name || null;

  const startDate = item.start_date
    ? new Date(item.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const endDate = item.end_date
    ? new Date(item.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <AppCard style={styles.itemCard} onPress={() => onOpen(itemId)}>
      {/* Icon + name + status badge */}
      <View style={styles.topRow}>
        {/* "project" isn't a ProcurementDocType — supplier's building icon
            (admin/reference-data tint) is the closest match for a
            construction project/site tile. */}
        <DocumentIconTile type="supplier" />
        <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={2}>
          {item.name || 'Unnamed Project'}
        </Text>
        {status ? (
          <AppBadge variant={getStatusVariant(status)}>
            {statusLabels[status] || status}
          </AppBadge>
        ) : null}
      </View>

      {/* Code — prominent */}
      {code ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Code</Text>
          <Text style={[styles.metaValue, { color: colors.primary, fontWeight: '600' }]}>{code}</Text>
        </View>
      ) : null}

      {/* Office/site location from new FK */}
      {officeLocation ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Site</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>{officeLocation}</Text>
        </View>
      ) : location ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Location</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>{location}</Text>
        </View>
      ) : null}

      {sector ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Sector</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]} numberOfLines={1}>{sector}</Text>
        </View>
      ) : null}
      {contactPerson ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Contact</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>{contactPerson}</Text>
        </View>
      ) : null}
      {mobileNumber ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Mobile</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{mobileNumber}</Text>
        </View>
      ) : null}
      {startDate ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Start</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{startDate}</Text>
        </View>
      ) : null}
      {endDate ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>End</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{endDate}</Text>
        </View>
      ) : null}
    </AppCard>
  );
});

function ProjectsScreenInner() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<Project> | null>(null);
  // initialLoading fills the screen once; listLoading (pagination / filter /
  // search reloads) keeps the list AND its pagination footer mounted.
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperuser = user?.is_superuser ?? false;
  const canCreate = isSuperuser || (hasPermission('project', 'create') ?? false);

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

  const loadProjects = useCallback(async () => {
    const { seq } = nextSignal();
    setError(null);
    if (hasLoadedOnce.current) setListLoading(true);
    try {
      const response = await projectsApi.getAll({
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
      setError(err.message || 'Failed to load projects');
      toast(err.message || 'Failed to load projects', 'error');
    } finally {
      if (isCurrent(seq) && mountedRef.current) {
        setInitialLoading(false);
        setListLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, debouncedSearch, filters, nextSignal, isCurrent, mountedRef]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const onRefresh = () => { setRefreshing(true); loadProjects(); };

  const filterFields: FilterField[] = [
    { name: 'code',           label: 'Code',           type: 'text', group: 'Basic Info' },
    { name: 'location',       label: 'Location',       type: 'text', group: 'Basic Info' },
    { name: 'sector',         label: 'Sector',         type: 'text', group: 'Basic Info' },
    { name: 'contact_person', label: 'Contact Person', type: 'text', group: 'Contact' },
    {
      name: 'project_status', label: 'Status', type: 'select', group: 'Status',
      options: [
        { value: 'active',    label: 'Active' },
        { value: 'completed', label: 'Completed' },
        { value: 'on_hold',   label: 'On Hold' },
      ],
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
  useRefetchOnFocus(loadProjects);

  const openProject = useCallback(
    (id: number) => router.push(`/projects/${id}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Project }) => (
      <ProjectCard item={item} colors={C} onOpen={openProject} />
    ),
    [C, openProject],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <AppHeader
          title="Projects"
          subtitle={data?.count != null ? `${data.count} project${data.count !== 1 ? 's' : ''}` : undefined}
          showBack
          right={canCreate ? (
            <AppButton
              title="New Project"
              variant="primary"
              size="sm"
              onPress={() => router.push('/projects/new')}
            />
          ) : undefined}
        />

        {/* Search + filter */}
        <ListSearchBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search projects..."
          filterFields={filterFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFilterReset={handleFilterReset}
          filterSaveKey="projects"
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
          <AppEmptyState variant="loading" title="Loading projects..." />
        ) : error && !data?.results?.length ? (
          <AppErrorState title="Failed to load" message={error} onRetry={loadProjects} />
        ) : !data?.results?.length && !listLoading ? (
          <AppEmptyState variant="empty" icon="folder" title="No projects" message="No projects found matching your criteria." />
        ) : (
          <View style={{ flex: 1 }}>
            {/* Slim reload bar — the list and its pagination stay mounted */}
            {listLoading && !refreshing ? (
              <View style={[styles.reloadBar, { backgroundColor: C.surfaceSoft }]}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={[styles.reloadText, { color: C.textMuted }]}>Updating…</Text>
              </View>
            ) : null}
            <FlashList
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


export default function ProjectsScreen() {
  return (
    <AppPermissionGate category="project" action="view">
      <ProjectsScreenInner />
    </AppPermissionGate>
  );
}
