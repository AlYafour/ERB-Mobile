import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { purchaseInvoicesApi } from '@/lib/api/purchase-invoices';
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
import { PurchaseInvoice, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { AppPermissionGate } from '@/components/AppPermissionGate';

type AppColors = typeof Colors.light | typeof Colors.dark;

const statusLabels: Record<string, string> = {
  draft:     'Draft',
  pending:   'Pending',
  approved:  'Approved',
  rejected:  'Rejected',
  paid:      'Paid',
  cancelled: 'Cancelled',
};

function getStatusVariant(s?: string): 'success' | 'danger' | 'warning' | 'info' | 'default' {
  switch (s) {
    case 'approved': return 'success';
    case 'paid':     return 'success';
    case 'rejected': return 'danger';
    case 'cancelled':return 'danger';
    case 'pending':  return 'warning';
    case 'draft':    return 'info';
    default:         return 'default';
  }
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PurchaseInvoicesScreenInner() {
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<PurchaseInvoice> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 400ms debounce
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { loadInvoices(); }, [page, debouncedSearch, filters]);

  const loadInvoices = async () => {
    try {
      setError(null);
      setLoading(true);
      setData(await purchaseInvoicesApi.getAll({ page, page_size: 50, search: debouncedSearch, ...filters }));
    } catch (err: any) {
      setError(err.message || 'Failed to load purchase invoices');
      toast(err.message || 'Failed to load purchase invoices', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterFields: FilterField[] = [
    { name: 'invoice_number', label: 'Invoice Number', type: 'text',   group: 'Invoice Info' },
    {
      name: 'status', label: 'Status', type: 'select', group: 'Status',
      options: [
        { value: 'draft',      label: 'Draft' },
        { value: 'pending',    label: 'Pending' },
        { value: 'approved',   label: 'Approved' },
        { value: 'rejected',   label: 'Rejected' },
        { value: 'paid',       label: 'Paid' },
        { value: 'cancelled',  label: 'Cancelled' },
      ],
    },
    { name: 'invoice_date_after',  label: 'Invoice Date From', type: 'date', group: 'Dates' },
    { name: 'invoice_date_before', label: 'Invoice Date To',   type: 'date', group: 'Dates' },
  ];

  const handleFilterChange   = (f: Record<string, any>) => { setFilters(f); setPage(1); };
  const handleFilterReset    = () => { setFilters({}); setPage(1); };
  const handleRemoveFilter   = (key: string) => {
    const f = { ...filters }; delete f[key]; setFilters(f); setPage(1);
  };

  const S = makeStyles(C);

  const renderItem = ({ item }: { item: PurchaseInvoice }) => {
    const itemId      = Number(item.id);
    const invoiceNum  = item.invoice_number || `INV-${itemId}`;
    const supplier    = typeof item.supplier === 'object'
      ? (item.supplier as any)?.name
      : (item as any).supplier_name || null;
    const poNumber    = typeof item.purchase_order === 'object'
      ? (item.purchase_order as any)?.order_number
      : (item as any).purchase_order_number || null;
    const invoiceDate = fmtDate((item as any).invoice_date);
    const dueDate     = fmtDate((item as any).due_date);
    const totalAmt    = (item as any).total ?? item.total_amount;
    const total       = totalAmt != null ? `AED ${Number(totalAmt).toFixed(2)}` : null;

    const isOverdue = dueDate && (item as any).due_date && item.status !== 'paid'
      && new Date((item as any).due_date) < new Date();

    return (
      <AppCard style={S.itemCard} onPress={() => router.push(`/purchase-invoices/${itemId}` as any)}>
        {/* Number + status badge */}
        <View style={S.topRow}>
          <Text style={[S.invoiceNum, { color: C.primary }]} numberOfLines={1}>{invoiceNum}</Text>
          <AppBadge variant={getStatusVariant(item.status)}>
            {statusLabels[item.status || ''] || item.status || 'Unknown'}
          </AppBadge>
        </View>

        {/* Meta rows */}
        {supplier ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Supplier</Text>
            <Text style={[S.metaValue, { color: C.textPrimary }]} numberOfLines={1}>{supplier}</Text>
          </View>
        ) : null}
        {poNumber ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>LPO</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]}>{poNumber}</Text>
          </View>
        ) : null}
        {invoiceDate ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Invoice Date</Text>
            <Text style={[S.metaValue, { color: C.textSecondary }]}>{invoiceDate}</Text>
          </View>
        ) : null}
        {dueDate ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Due Date</Text>
            <Text style={[S.metaValue, { color: isOverdue ? C.danger : C.textSecondary, fontWeight: isOverdue ? '600' : '400' }]}>
              {dueDate}{isOverdue ? ' · Overdue' : ''}
            </Text>
          </View>
        ) : null}
        {total ? (
          <View style={S.metaRow}>
            <Text style={[S.metaLabel, { color: C.textMuted }]}>Total</Text>
            <Text style={[S.metaValue, { color: C.success, fontWeight: '700' }]}>{total}</Text>
          </View>
        ) : null}
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={[S.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <View style={S.inner}>
        {/* No "New" button: invoices are created from a GRN's "Create Invoice"
            card (needs a purchase_order_id) — the old button opened the form
            without one and it loaded nothing (getById(NaN)). */}
        <AppHeader
          title="Purchase Invoices"
          subtitle={data?.count != null ? `${data.count} invoice${data.count !== 1 ? 's' : ''}` : undefined}
          showBack
        />

        <View style={S.searchContainer}>
          <View style={S.searchRow}>
            <View style={S.searchInputWrapper}>
              <Input placeholder="Search invoices..." value={search} onChangeText={setSearch}
                containerStyle={S.searchInput}
                leftIcon={<IconSymbol name="magnifyingglass" size={20} color={C.textMuted} />} />
            </View>
            <View style={S.filterBtnWrapper}>
              <FilterPanel fields={filterFields} filters={filters}
                onFilterChange={handleFilterChange} onReset={handleFilterReset}
                saveKey="purchase-invoices" />
            </View>
          </View>
        </View>

        {Object.keys(filters).length > 0 && (
          <FilterTags filters={filters} fields={filterFields}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={() => { setFilters({}); setPage(1); }} />
        )}

        {loading && !refreshing ? (
          <AppEmptyState variant="loading" title="Loading invoices..." />
        ) : error && !data?.results?.length ? (
          <AppEmptyState variant="error" title="Failed to load" message={error}
            actionLabel="Try Again" onAction={loadInvoices} />
        ) : !data?.results?.length ? (
          <AppEmptyState variant="empty" icon="doc.text" title="No invoices"
            message="No purchase invoices found matching your criteria." />
        ) : (
          <FlatList
            data={data.results}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id || Math.random())}
            contentContainerStyle={S.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInvoices(); }}
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
    searchRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    searchInputWrapper:{ flex: 1 },
    searchInput:      { marginBottom: 0 },
    filterBtnWrapper: { alignSelf: 'flex-start' },

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
    invoiceNum: { fontSize: 14, fontWeight: '700', flex: 1, letterSpacing: 0.2 },

    metaRow: {
      flexDirection: 'row', alignItems: 'center',
      gap: Spacing.sm, paddingVertical: 3,
    },
    metaLabel: { fontSize: 12, fontWeight: '500', minWidth: 88, flexShrink: 0 },
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


export default function PurchaseInvoicesScreen() {
  return (
    <AppPermissionGate category="purchase_invoice" action="view">
      <PurchaseInvoicesScreenInner />
    </AppPermissionGate>
  );
}
