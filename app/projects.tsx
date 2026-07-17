import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { projectsApi } from '@/lib/api/projects';
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
import { Project, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { AppPermissionGate } from '@/components/AppPermissionGate';

type AppColors = typeof Colors.light | typeof Colors.dark;

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperuser = user?.is_superuser ?? false;
  const canCreate = isSuperuser || (hasPermission('project', 'create') ?? false);

  // Debounce search 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadProjects(); }, [page, debouncedSearch, filters]);

  const loadProjects = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await projectsApi.getAll({
        page,
        page_size: 50,
        search: debouncedSearch,
        ...filters,
      });
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
      toast(err.message || 'Failed to load projects', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  const S = makeStyles(C);

  const renderItem = ({ item }: { item: Project }) => {
    const itemId = Number(item.id);
    const r      = item as any;

    const code           = r.code || null;
    const status         = r.project_status || r.status || null;
    const location       = r.location || null;
    const contactPerson  = r.contact_person || null;
    const mobileNumber   = r.mobile_number || null;
    const sector         = r.sector || null;
    const officeLocation = r.office_location_detail?.name || null;

    const startDate = item.start_date
      ? new Date(item.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
    const endDate = item.end_date
      ? new Date(item.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

    return (
      <AppCard style={S.itemCard} onPress={() => router.push(`/projects/${itemId}` as any)}>
        {/* Name + status badge */}
        <View style={S.topRow}>
          <Text style={[S.itemName, { color: C.textPrimary }]} numberOfLines={2}>
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
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Code</Text>
            <Text style={[S.metaValue, { color: C.primary, fontWeight: '600' }]}>{code}</Text>
          </View>
        ) : null}

        {/* Office/site location from new FK */}
        {officeLocation ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Site</Text>
            <Text style={[S.metaValue, { color: C.textPrimary }]} numberOfLines={1}>{officeLocation}</Text>
          </View>
        ) : location ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Location</Text>
            <Text style={[S.metaValue, { color: C.textPrimary }]} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}

        {sector ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Sector</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]} numberOfLines={1}>{sector}</Text>
          </View>
        ) : null}
        {contactPerson ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Contact</Text>
            <Text style={[S.metaValue, { color: C.textPrimary }]} numberOfLines={1}>{contactPerson}</Text>
          </View>
        ) : null}
        {mobileNumber ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Mobile</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]}>{mobileNumber}</Text>
          </View>
        ) : null}
        {startDate ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Start</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]}>{startDate}</Text>
          </View>
        ) : null}
        {endDate ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>End</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]}>{endDate}</Text>
          </View>
        ) : null}
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={[S.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <View style={S.inner}>
        <AppHeader
          title="Projects"
          subtitle={data?.count != null ? `${data.count} project${data.count !== 1 ? 's' : ''}` : undefined}
          showBack
          right={canCreate ? (
            <AppButton
              title="New Project"
              variant="primary"
              size="sm"
              onPress={() => router.push('/projects/new' as any)}
            />
          ) : undefined}
        />

        {/* Search + filter */}
        <View style={S.searchContainer}>
          <View style={S.searchRow}>
            <View style={S.searchInputWrapper}>
              <Input
                placeholder="Search projects..."
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
                saveKey="projects"
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
          <AppEmptyState variant="loading" title="Loading projects..." />
        ) : error && !data?.results?.length ? (
          <AppEmptyState variant="error" title="Failed to load" message={error} actionLabel="Try Again" onAction={loadProjects} />
        ) : !data?.results?.length ? (
          <AppEmptyState variant="empty" icon="folder" title="No projects" message="No projects found matching your criteria." />
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


export default function ProjectsScreen() {
  return (
    <AppPermissionGate category="project" action="view">
      <ProjectsScreenInner />
    </AppPermissionGate>
  );
}
