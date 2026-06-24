import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { suppliersApi } from '@/lib/api/suppliers';
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
import { Supplier, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';

type AppColors = typeof Colors.light | typeof Colors.dark;

export default function SuppliersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<Supplier> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperuser = user?.is_superuser ?? false;
  const canCreate = isSuperuser || (hasPermission('supplier', 'create') ?? false);

  // Debounce search 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadSuppliers(); }, [page, debouncedSearch, filters]);

  const loadSuppliers = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await suppliersApi.getAll({
        page,
        page_size: 50,
        search: debouncedSearch,
        ...filters,
      });
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load suppliers');
      toast(err.message || 'Failed to load suppliers', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadSuppliers(); };

  const filterFields: FilterField[] = [
    { name: 'supplier_number', label: 'Supplier No.', type: 'text', group: 'Basic Info' },
    { name: 'contact_person',  label: 'Contact Person', type: 'text', group: 'Contact' },
    { name: 'email',           label: 'Email',          type: 'text', group: 'Contact' },
    { name: 'phone',           label: 'Phone',          type: 'text', group: 'Contact' },
    { name: 'city',            label: 'City',           type: 'text', group: 'Location' },
    { name: 'country',         label: 'Country',        type: 'text', group: 'Location' },
    {
      name: 'is_active', label: 'Status', type: 'select', group: 'Status',
      options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
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

  const renderItem = ({ item }: { item: Supplier }) => {
    const itemId   = Number(item.id);
    const name     = item.name || (item as any).business_name || 'Unnamed Supplier';
    const supplierNum = (item as any).supplier_number || null;
    const isActive = (item as any).is_active;
    const category = (item as any).category || (item as any).supplier_type || null;
    const city     = (item as any).city || null;
    const country  = (item as any).country || null;
    const location = [city, country].filter(Boolean).join(', ') || null;

    return (
      <AppCard style={S.itemCard} onPress={() => router.push(`/suppliers/${itemId}` as any)}>
        {/* Name + status badge */}
        <View style={S.topRow}>
          <Text style={[S.itemName, { color: C.textPrimary }]} numberOfLines={2}>{name}</Text>
          {isActive !== undefined ? (
            <AppBadge variant={isActive ? 'success' : 'danger'}>
              {isActive ? 'Active' : 'Inactive'}
            </AppBadge>
          ) : null}
        </View>

        {/* Meta rows */}
        {supplierNum ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Supplier No.</Text>
            <Text style={[S.metaValue, { color: C.primary }]}>{supplierNum}</Text>
          </View>
        ) : null}
        {category ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Category</Text>
            <Text style={[S.metaValue, { color: C.textPrimary }]} numberOfLines={1}>{category}</Text>
          </View>
        ) : null}
        {item.contact_person ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Contact</Text>
            <Text style={[S.metaValue, { color: C.textPrimary }]} numberOfLines={1}>{item.contact_person}</Text>
          </View>
        ) : null}
        {item.phone ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Phone</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]}>{item.phone}</Text>
          </View>
        ) : null}
        {item.email ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Email</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]} numberOfLines={1}>{item.email}</Text>
          </View>
        ) : null}
        {location ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Location</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={[S.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <View style={S.inner}>
        <AppHeader
          title="Suppliers"
          subtitle={data?.count != null ? `${data.count} supplier${data.count !== 1 ? 's' : ''}` : undefined}
          right={canCreate ? (
            <AppButton
              title="New Supplier"
              variant="primary"
              size="sm"
              onPress={() => router.push('/suppliers/new' as any)}
            />
          ) : undefined}
        />

        {/* Search + filter */}
        <View style={S.searchContainer}>
          <View style={S.searchRow}>
            <View style={S.searchInputWrapper}>
              <Input
                placeholder="Search suppliers..."
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
                saveKey="suppliers"
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
          <AppEmptyState variant="loading" title="Loading suppliers..." />
        ) : error && !data?.results?.length ? (
          <AppEmptyState variant="error" title="Failed to load" message={error} actionLabel="Try Again" onAction={loadSuppliers} />
        ) : !data?.results?.length ? (
          <AppEmptyState variant="empty" icon="building.2" title="No suppliers" message="No suppliers found matching your criteria." />
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
    metaLabel: { fontSize: 12, fontWeight: '500', minWidth: 88, flexShrink: 0 },
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
