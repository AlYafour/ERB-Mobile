import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';
import { useCancellableFetch } from '@/lib/hooks/use-cancellable-fetch';
import { purchaseInvoicesApi } from '@/lib/api/purchase-invoices';
import { toast } from '@/lib/hooks/use-toast';
import { ListSearchBar } from '@/components/ui/ListSearchBar';
import { FilterField } from '@/components/ui/FilterPanel';
import FilterTags from '@/components/ui/FilterTags';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { DocumentIconTile } from '@/components/ui/DocumentIconTile';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppPagination } from '@/components/ui/AppPagination';
import { PurchaseInvoice, PaginatedResponse } from '@/types';
import { getDateAccent } from '@/lib/utils/list-helpers';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { AppPermissionGate } from '@/components/AppPermissionGate';

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

/**
 * Memoized list row — re-renders only when its item or theme changes, not on
 * every parent state change (pagination, filters, loading flags).
 */
const InvoiceCard = React.memo(function InvoiceCard({
  item,
  colors,
  onOpen,
}: {
  item: PurchaseInvoice;
  colors: typeof Colors.light | typeof Colors.dark;
  onOpen: (id: number) => void;
}) {
  const itemId      = Number(item.id);
  const invoiceNum  = item.invoice_number || `INV-${itemId}`;
  const supplier    = typeof item.supplier === 'object'
    ? (item.supplier as any)?.name
    : (item as any).supplier_name || null;
  const poNumber    = typeof item.purchase_order === 'object'
    ? (item.purchase_order as any)?.order_number
    : (item as any).purchase_order_number || null;
  const invoiceDate = fmtDate((item as any).invoice_date);
  const dueRaw: string | undefined = (item as any).due_date;
  const dueDate     = fmtDate(dueRaw);
  const totalAmt    = (item as any).total ?? item.total_amount;
  const total       = totalAmt != null ? `AED ${Number(totalAmt).toFixed(2)}` : null;

  const isOverdue = item.status !== 'paid' && getDateAccent(dueRaw).overdue;

  return (
    <AppCard
      style={[styles.itemCard, isOverdue && { borderLeftWidth: 3, borderLeftColor: colors.danger }]}
      onPress={() => onOpen(itemId)}
    >
      {/* Icon + number/supplier + status badge */}
      <View style={styles.topRow}>
        <DocumentIconTile type="purchase_invoice" />
        <View style={styles.titleCol}>
          <Text style={[styles.invoiceNum, { color: colors.primary }]} numberOfLines={1}>{invoiceNum}</Text>
          {supplier ? (
            <Text style={[styles.supplierText, { color: colors.textSecondary }]} numberOfLines={1}>{supplier}</Text>
          ) : null}
        </View>
        <AppBadge variant={getStatusVariant(item.status)}>
          {statusLabels[item.status || ''] || item.status || 'Unknown'}
        </AppBadge>
      </View>

      {/* Meta rows */}
      {poNumber ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>LPO</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{poNumber}</Text>
        </View>
      ) : null}
      {invoiceDate ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Invoice Date</Text>
          <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{invoiceDate}</Text>
        </View>
      ) : null}
      {dueDate ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Due Date</Text>
          <Text style={[styles.metaValue, { color: isOverdue ? colors.danger : colors.textSecondary, fontWeight: isOverdue ? '600' : '400' }]}>
            {dueDate}{isOverdue ? ' · Overdue' : ''}
          </Text>
        </View>
      ) : null}
      {total ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.metaValue, { color: colors.success, fontWeight: '700' }]}>{total}</Text>
        </View>
      ) : null}
    </AppCard>
  );
});

function PurchaseInvoicesScreenInner() {
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [data, setData] = useState<PaginatedResponse<PurchaseInvoice> | null>(null);
  // initialLoading fills the screen once; listLoading (pagination / filter /
  // search reloads) keeps the list AND its pagination footer mounted.
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stale-response guard: an older response never overwrites a newer one,
  // and nothing sets state after unmount.
  const { nextSignal, isCurrent, mountedRef } = useCancellableFetch();
  const hasLoadedOnce = useRef(false);

  // 400ms debounce
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadInvoices = useCallback(async () => {
    const { seq } = nextSignal();
    setError(null);
    if (hasLoadedOnce.current) setListLoading(true);
    try {
      const response = await purchaseInvoicesApi.getAll({ page, page_size: 50, search: debouncedSearch, ...filters });
      if (!isCurrent(seq) || !mountedRef.current) return;
      setData(response);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      if (!isCurrent(seq) || !mountedRef.current) return;
      setError(err.message || 'Failed to load purchase invoices');
      toast(err.message || 'Failed to load purchase invoices', 'error');
    } finally {
      if (isCurrent(seq) && mountedRef.current) {
        setInitialLoading(false);
        setListLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, debouncedSearch, filters, nextSignal, isCurrent, mountedRef]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const onRefresh = () => { setRefreshing(true); loadInvoices(); };

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

  // Stale-list fix: refetch when the screen regains focus (create/detail flows)
  useRefetchOnFocus(loadInvoices);

  const openInvoice = useCallback(
    (id: number) => router.push(`/purchase-invoices/${id}` as any),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: PurchaseInvoice }) => (
      <InvoiceCard item={item} colors={C} onOpen={openInvoice} />
    ),
    [C, openInvoice],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        {/* No "New" button: invoices are created from a GRN's "Create Invoice"
            card (needs a purchase_order_id) — the old button opened the form
            without one and it loaded nothing (getById(NaN)). */}
        <AppHeader
          title="Purchase Invoices"
          subtitle={data?.count != null ? `${data.count} invoice${data.count !== 1 ? 's' : ''}` : undefined}
          showBack
        />

        <ListSearchBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search invoices..."
          filterFields={filterFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFilterReset={handleFilterReset}
          filterSaveKey="purchase-invoices"
        />

        {Object.keys(filters).length > 0 && (
          <FilterTags filters={filters} fields={filterFields}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={() => { setFilters({}); setPage(1); }} />
        )}

        {initialLoading ? (
          <AppEmptyState variant="loading" title="Loading invoices..." />
        ) : error && !data?.results?.length ? (
          <AppErrorState title="Failed to load" message={error} onRetry={loadInvoices} />
        ) : !data?.results?.length && !listLoading ? (
          <AppEmptyState variant="empty" icon="doc.text" title="No invoices"
            message="No purchase invoices found matching your criteria." />
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
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                  tintColor={C.primary} colors={[C.primary]} />
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
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.md,
  },
  titleCol: { flex: 1, gap: 2 },
  invoiceNum: { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  supplierText: { fontSize: 13, lineHeight: 18 },

  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, paddingVertical: 3,
  },
  metaLabel: { fontSize: 12, fontWeight: '500', minWidth: 88, flexShrink: 0 },
  metaValue: { fontSize: 13, flex: 1 },

  reloadBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 6,
  },
  reloadText: { fontSize: 12, fontWeight: '500' },
});


export default function PurchaseInvoicesScreen() {
  return (
    <AppPermissionGate category="purchase_invoice" action="view">
      <PurchaseInvoicesScreenInner />
    </AppPermissionGate>
  );
}
