import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { purchaseQuotationsApi } from '@/lib/api/purchase-quotations';
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
import { PurchaseQuotation, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';

type AppColors = typeof Colors.light | typeof Colors.dark;

const statusLabels: Record<string, string> = {
  pending:   'Pending',
  awarded:   'Awarded',
  rejected:  'Rejected',
  expired:   'Expired',
  cancelled: 'Cancelled',
};

function getStatusVariant(s?: string): 'success' | 'danger' | 'warning' | 'info' | 'default' {
  switch (s) {
    case 'awarded':   return 'success';
    case 'rejected':
    case 'cancelled':
    case 'expired':   return 'danger';
    case 'pending':   return 'warning';
    default:          return 'default';
  }
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PurchaseQuotationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<PurchaseQuotation> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperuser = user?.is_superuser ?? false;
  const canCreate = isSuperuser || (hasPermission('purchase_quotation', 'create') ?? false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { loadQuotations(); }, [page, debouncedSearch, filters]);

  const loadQuotations = async () => {
    try {
      setError(null);
      setLoading(true);
      setData(await purchaseQuotationsApi.getAll({ page, page_size: 50, search: debouncedSearch, ...filters }));
    } catch (err: any) {
      setError(err.message || 'Failed to load purchase quotations');
      toast(err.message || 'Failed to load purchase quotations', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterFields: FilterField[] = [
    { name: 'quotation_number', label: 'Quotation Number', type: 'text', group: 'Quotation Info' },
    {
      name: 'status', label: 'Status', type: 'select', group: 'Status',
      options: [
        { value: 'pending',   label: 'Pending' },
        { value: 'awarded',   label: 'Awarded' },
        { value: 'rejected',  label: 'Rejected' },
        { value: 'expired',   label: 'Expired' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { name: 'quotation_date_after',  label: 'Quotation Date From', type: 'date', group: 'Dates' },
    { name: 'quotation_date_before', label: 'Quotation Date To',   type: 'date', group: 'Dates' },
    { name: 'valid_until_after',  label: 'Valid Until From', type: 'date', group: 'Dates' },
    { name: 'valid_until_before', label: 'Valid Until To',   type: 'date', group: 'Dates' },
    { name: 'total', label: 'Total Amount', type: 'range', group: 'Amount' },
  ];

  const handleFilterChange = (f: Record<string, any>) => { setFilters(f); setPage(1); };
  const handleFilterReset  = () => { setFilters({}); setPage(1); };
  const handleRemoveFilter = (key: string) => {
    const f = { ...filters }; delete f[key]; setFilters(f); setPage(1);
  };

  const S = makeStyles(C);

  const renderItem = ({ item }: { item: PurchaseQuotation }) => {
    const itemId       = Number(item.id);
    const pqNum        = (item as any).quotation_number || `PQ-${itemId}`;
    const supplierName = typeof item.supplier === 'object'
      ? item.supplier?.name : (item as any).supplier_name || null;
    const quotDate     = fmtDate((item as any).quotation_date);
    const validUntil   = fmtDate((item as any).valid_until);
    const total        = (item as any).total ?? (item as any).total_amount;

    return (
      <AppCard style={S.itemCard} onPress={() => router.push(`/purchase-quotations/${itemId}` as any)}>
        <View style={S.topRow}>
          <Text style={[S.itemNum, { color: C.primary }]} numberOfLines={1}>{pqNum}</Text>
          <AppBadge variant={getStatusVariant(item.status)}>
            {statusLabels[item.status || ''] || item.status || 'Unknown'}
          </AppBadge>
        </View>
        {supplierName ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Supplier</Text>
            <Text style={[S.metaValue, { color: C.textPrimary }]} numberOfLines={1}>{supplierName}</Text>
          </View>
        ) : null}
        {quotDate ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Quotation Date</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]}>{quotDate}</Text>
          </View>
        ) : null}
        {validUntil ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Valid Until</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]}>{validUntil}</Text>
          </View>
        ) : null}
        {total != null ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Total</Text>
            <Text style={[S.metaValue, { color: C.success, fontWeight: '700' }]}>
              AED {Number(total).toFixed(2)}
            </Text>
          </View>
        ) : null}
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={[S.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <View style={S.inner}>
        <AppHeader
          title="Purchase Quotations"
          subtitle={data?.count != null ? `${data.count} quotation${data.count !== 1 ? 's' : ''}` : undefined}
          right={canCreate ? (
            <AppButton title="New" variant="primary" size="sm"
              onPress={() => router.push('/purchase-quotations/new' as any)} />
          ) : undefined}
        />

        <View style={S.searchContainer}>
          <View style={S.searchRow}>
            <View style={S.searchInputWrapper}>
              <Input placeholder="Search purchase quotations..." value={search} onChangeText={setSearch}
                containerStyle={S.searchInput}
                leftIcon={<IconSymbol name="magnifyingglass" size={20} color={C.textMuted} />} />
            </View>
            <View style={S.filterBtnWrapper}>
              <FilterPanel fields={filterFields} filters={filters}
                onFilterChange={handleFilterChange} onReset={handleFilterReset}
                saveKey="purchase-quotations" />
            </View>
          </View>
        </View>

        {Object.keys(filters).length > 0 && (
          <FilterTags filters={filters} fields={filterFields}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={() => { setFilters({}); setPage(1); }} />
        )}

        {loading && !refreshing ? (
          <AppEmptyState variant="loading" title="Loading purchase quotations..." />
        ) : error && !data?.results?.length ? (
          <AppEmptyState variant="error" title="Failed to load" message={error}
            actionLabel="Try Again" onAction={loadQuotations} />
        ) : !data?.results?.length ? (
          <AppEmptyState variant="empty" icon="doc.text" title="No purchase quotations"
            message="No purchase quotations found matching your criteria." />
        ) : (
          <FlatList
            data={data.results}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id || Math.random())}
            contentContainerStyle={S.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); loadQuotations(); }}
                tintColor={C.primary} colors={[C.primary]} />
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
    searchRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    searchInputWrapper:{ flex: 1 },
    searchInput:       { marginBottom: 0 },
    filterBtnWrapper:  { alignSelf: 'flex-start' },

    listContent: {
      padding: Layout.screenPadding,
      paddingTop: Spacing.md,
      paddingBottom: 120,
    },
    itemCard: { marginBottom: Spacing.sm },

    topRow: {
      flexDirection: 'row', alignItems: 'flex-start',
      gap: Spacing.sm, marginBottom: Spacing.sm,
    },
    itemNum: { fontSize: 14, fontWeight: '700', flex: 1, letterSpacing: 0.2 },

    metaRow: {
      flexDirection: 'row', alignItems: 'center',
      gap: Spacing.sm, paddingVertical: 3,
    },
    metaLabel: { fontSize: 12, fontWeight: '500', minWidth: 110, flexShrink: 0 },
    metaValue: { fontSize: 13, flex: 1 },

    pagination: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
      gap: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth,
    },
    paginationBtn:  { minWidth: 80 },
    paginationText: { fontSize: Typography.sizes.sm, textAlign: 'center', flex: 1 },
  });
}
