import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';
import { useCancellableFetch } from '@/lib/hooks/use-cancellable-fetch';
import { suppliersApi } from '@/lib/api/suppliers';
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
import { Supplier, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { AppPermissionGate } from '@/components/AppPermissionGate';

/**
 * Memoized list row — re-renders only when its item or theme changes, not on
 * every parent state change (pagination, filters, loading flags).
 */
const SupplierCard = React.memo(function SupplierCard({
  item,
  colors,
  onOpen,
}: {
  item: Supplier;
  colors: typeof Colors.light | typeof Colors.dark;
  onOpen: (id: number) => void;
}) {
  const itemId   = Number(item.id);
  const name     = item.name || (item as any).business_name || 'Unnamed Supplier';
  const supplierNum = (item as any).supplier_number || null;
  const isActive = (item as any).is_active;
  const category = (item as any).category || (item as any).supplier_type || null;
  const city     = (item as any).city || null;
  const country  = (item as any).country || null;
  const location = [city, country].filter(Boolean).join(', ') || null;

  return (
    <AppCard style={styles.itemCard} onPress={() => onOpen(itemId)}>
      {/* Icon + name + status badge */}
      <View style={styles.topRow}>
        <DocumentIconTile type="supplier" />
        <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={2}>{name}</Text>
        {isActive !== undefined ? (
          <AppBadge variant={isActive ? 'success' : 'danger'}>
            {isActive ? 'Active' : 'Inactive'}
          </AppBadge>
        ) : null}
      </View>

      {/* Meta rows */}
      {supplierNum ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Supplier No.</Text>
          <Text style={[styles.metaValue, { color: colors.primary }]}>{supplierNum}</Text>
        </View>
      ) : null}
      {category ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Category</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>{category}</Text>
        </View>
      ) : null}
      {item.contact_person ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Contact</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>{item.contact_person}</Text>
        </View>
      ) : null}
      {item.phone ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Phone</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{item.phone}</Text>
        </View>
      ) : null}
      {item.email ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Email</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]} numberOfLines={1}>{item.email}</Text>
        </View>
      ) : null}
      {location ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Location</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]} numberOfLines={1}>{location}</Text>
        </View>
      ) : null}
    </AppCard>
  );
});

function SuppliersScreenInner() {
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
  // initialLoading fills the screen once; listLoading (pagination / filter /
  // search reloads) keeps the list AND its pagination footer mounted.
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperuser = user?.is_superuser ?? false;
  const canCreate = isSuperuser || (hasPermission('supplier', 'create') ?? false);

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

  const loadSuppliers = useCallback(async () => {
    const { seq } = nextSignal();
    setError(null);
    if (hasLoadedOnce.current) setListLoading(true);
    try {
      const response = await suppliersApi.getAll({
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
      setError(err.message || 'Failed to load suppliers');
      toast(err.message || 'Failed to load suppliers', 'error');
    } finally {
      if (isCurrent(seq) && mountedRef.current) {
        setInitialLoading(false);
        setListLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, debouncedSearch, filters, nextSignal, isCurrent, mountedRef]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

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

  // Stale-list fix: refetch when the screen regains focus (create/detail flows)
  useRefetchOnFocus(loadSuppliers);

  const openSupplier = useCallback(
    (id: number) => router.push(`/suppliers/${id}` as any),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Supplier }) => (
      <SupplierCard item={item} colors={C} onOpen={openSupplier} />
    ),
    [C, openSupplier],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <AppHeader
          title="Suppliers"
          subtitle={data?.count != null ? `${data.count} supplier${data.count !== 1 ? 's' : ''}` : undefined}
          showBack
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
        <ListSearchBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search suppliers..."
          filterFields={filterFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFilterReset={handleFilterReset}
          filterSaveKey="suppliers"
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
          <AppEmptyState variant="loading" title="Loading suppliers..." />
        ) : error && !data?.results?.length ? (
          <AppErrorState title="Failed to load" message={error} onRetry={loadSuppliers} />
        ) : !data?.results?.length && !listLoading ? (
          <AppEmptyState variant="empty" icon="building.2" title="No suppliers" message="No suppliers found matching your criteria." />
        ) : (
          <View style={{ flex: 1 }}>
            {/* Slim reload bar — the list and its pagination stay mounted */}
            {listLoading && !refreshing ? (
              <View style={[styles.reloadBar, { backgroundColor: C.surfaceSoft }]}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={[styles.reloadText, { color: C.textMuted }]}>Updating…</Text>
              </View>
            ) : null}
            <FlatList
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
  metaLabel: { fontSize: 12, fontWeight: '500', minWidth: 88, flexShrink: 0 },
  metaValue: { fontSize: 13, flex: 1 },

  reloadBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 6,
  },
  reloadText: { fontSize: 12, fontWeight: '500' },
});


export default function SuppliersScreen() {
  return (
    <AppPermissionGate category="supplier" action="view">
      <SuppliersScreenInner />
    </AppPermissionGate>
  );
}
