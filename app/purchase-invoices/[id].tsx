import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseInvoicesApi } from '@/lib/api/purchase-invoices';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard, AppCardRow } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge, BadgeVariant } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppSkeletonList } from '@/components/ui/AppSkeleton';
import RejectionReasonDialog from '@/components/ui/RejectionReasonDialog';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useDetailFetch } from '@/lib/hooks/use-detail-fetch';
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh';
import { baseDetailStyles } from '@/lib/utils/detail-styles';
import { formatMoney } from '@/lib/utils/format';

type AppColors = typeof Colors.light | typeof Colors.dark;

const statusLabels: Record<string, string> = {
  draft: 'Draft', pending: 'Pending', approved: 'Approved',
  rejected: 'Rejected', paid: 'Paid', cancelled: 'Cancelled',
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  approved: 'success',
  paid: 'success',
  rejected: 'danger',
  cancelled: 'danger',
  pending: 'warning',
  draft: 'info',
};

function getStatusVariant(s?: string): BadgeVariant {
  return STATUS_VARIANTS[s || ''] ?? 'default';
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PurchaseInvoiceDetailScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const insets = useSafeAreaInsets();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [rejectOpen, setRejectOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const su = user?.is_superuser ?? false;
  const canApprove  = su || (hasPermission('purchase_invoice', 'approve')  ?? false);
  const canReject   = su || (hasPermission('purchase_invoice', 'reject')   ?? false);
  const canMarkPaid = su || (hasPermission('purchase_invoice', 'mark_paid') ?? false);

  const { data: invoice, loading, refreshing, reload, onRefresh } = useDetailFetch(
    (invId: number) => purchaseInvoicesApi.getById(invId), id, 'Failed to load invoice'
  );
  const pullToRefresh = usePullToRefresh(refreshing, onRefresh);

  const handleApprove = async () => {
    if (!await confirm('Approve this invoice?')) return;
    try {
      setApproving(true);
      await purchaseInvoicesApi.approve(id);
      toast('Invoice approved', 'success');
      reload();
    } catch (err: any) {
      toast(err.message || 'Failed to approve', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    try {
      setRejecting(true);
      await purchaseInvoicesApi.reject(id, reason);
      toast('Invoice rejected', 'info');
      setRejectOpen(false);
      reload();
    } catch (err: any) {
      toast(err.message || 'Failed to reject', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const S = makeStyles(C);

  if (loading && !invoice) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Purchase Invoice" showBack />
      <AppSkeletonList count={3} lines={4} />
    </SafeAreaView>
  );

  if (!invoice) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Purchase Invoice" showBack />
      <View style={S.center}>
        <AppEmptyState
          variant="error"
          title="Failed to load"
          message="Could not load the purchase invoice."
          actionLabel="Try Again"
          onAction={reload}
        />
      </View>
    </SafeAreaView>
  );

  const invoiceNum  = invoice.invoice_number || `INV-${id}`;
  const status      = invoice.status;
  const supplierName= typeof invoice.supplier === 'object' ? invoice.supplier.name : null;
  const poNumber    = typeof invoice.purchase_order === 'object' ? invoice.purchase_order.order_number : null;
  const poId        = typeof invoice.purchase_order === 'object' ? invoice.purchase_order.id : null;
  const grnNumber   = typeof invoice.goods_receiving === 'object' ? invoice.goods_receiving?.grn_number : null;
  const grnId       = typeof invoice.goods_receiving === 'object' ? invoice.goods_receiving?.id : null;

  const paidAmt     = invoice.paid_amount != null ? Number(invoice.paid_amount) : null;
  // The backend field for the grand total is inconsistently named `total` vs
  // `total_amount` depending on endpoint/serializer (see the same fallback in
  // app/purchase-invoices.tsx, app/purchase-orders.tsx, app/purchase-quotations.tsx
  // list screens) — read both so this doesn't silently show/compute a blank total.
  const totalRaw    = invoice.total ?? invoice.total_amount;
  const totalAmt    = totalRaw != null ? Number(totalRaw) : null;
  const outstanding = totalAmt != null && paidAmt != null && totalAmt > paidAmt
    ? totalAmt - paidAmt : null;
  // Amount due to post to markPaid by default — the remaining balance, not
  // the full invoice total (which would overwrite any partial payment already
  // recorded). Falls back to the full total when nothing has been paid yet.
  const amountDue   = totalAmt != null ? totalAmt - (paidAmt ?? 0) : undefined;

  const dueDate     = invoice.due_date;
  const isOverdue   = dueDate && status !== 'paid' && new Date(dueDate) < new Date();

  const handleMarkPaid = async () => {
    if (!await confirm('Mark this invoice as paid?')) return;
    try {
      setMarkingPaid(true);
      await purchaseInvoicesApi.markPaid(id, {
        paid_amount: amountDue,
        payment_date: new Date().toISOString().split('T')[0],
      });
      toast('Invoice marked as paid', 'success');
      reload();
    } catch (err: any) {
      toast(err.message || 'Failed to mark as paid', 'error');
    } finally {
      setMarkingPaid(false);
    }
  };

  // Which bottom bar to show
  const showApproveReject = status === 'pending' && (canApprove || canReject);
  const showMarkPaid      = status === 'approved' && canMarkPaid;
  const hasActions        = showApproveReject || showMarkPaid;

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader
        title={invoiceNum}
        subtitle={supplierName || undefined}
        showBack
        right={<AppBadge variant={getStatusVariant(status)}>{statusLabels[status || ''] || status || 'Unknown'}</AppBadge>}
      />

      <ScrollView
        contentContainerStyle={[S.content, { paddingBottom: hasActions ? 100 : 24 }]}
        refreshControl={pullToRefresh}
        showsVerticalScrollIndicator={false}
      >
        {/* Invoice Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Invoice Information</Text>
          <AppCardRow label="Supplier"     value={supplierName} />
          <AppCardRow label="Invoice No."  value={invoiceNum} />
          <AppCardRow label="Invoice Date" value={fmtDate(invoice.invoice_date)} />
          <AppCardRow label="Due Date"
            value={fmtDate(dueDate) ? `${fmtDate(dueDate)}${isOverdue ? ' · Overdue' : ''}` : null}
            valueColor={isOverdue ? C.danger : undefined} />
          {invoice.notes ? (
            <View style={[S.notesBox, { backgroundColor: C.surfaceSoft }]}>
              <Text style={[S.notesText, { color: C.textSecondary }]}>{invoice.notes}</Text>
            </View>
          ) : null}
          {invoice.rejection_reason ? (
            <View style={[S.notesBox, { backgroundColor: C.dangerBg }]}>
              <Text style={[S.notesText, { color: C.danger }]}>Rejection: {invoice.rejection_reason}</Text>
            </View>
          ) : null}
        </AppCard>

        {/* Linked Documents */}
        {(poNumber || grnNumber) ? (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Linked Documents</Text>
            {poNumber ? (
              <TouchableOpacity
                onPress={poId ? () => router.push(`/purchase-orders/${poId}`) : undefined}
                style={[S.linkRow, { borderBottomColor: C.divider }]}
              >
                <Text style={[S.linkLabel, { color: C.textMuted }]}>Purchase Order</Text>
                <Text style={[S.linkValue, { color: C.primary }]}>{poNumber} →</Text>
              </TouchableOpacity>
            ) : null}
            {grnNumber ? (
              <TouchableOpacity
                onPress={grnId ? () => router.push(`/goods-receiving/${grnId}`) : undefined}
                style={[S.linkRow, { borderBottomColor: C.divider }]}
              >
                <Text style={[S.linkLabel, { color: C.textMuted }]}>Goods Receipt</Text>
                <Text style={[S.linkValue, { color: C.primary }]}>{grnNumber} →</Text>
              </TouchableOpacity>
            ) : null}
          </AppCard>
        ) : null}

        {/* Line Items */}
        {invoice.items && invoice.items.length > 0 ? (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Items ({invoice.items.length})</Text>
            {invoice.items.map((item, i) => {
              const name = typeof item.product === 'object'
                ? item.product.name : item.product_name || 'Item';
              const lineTotal = item.quantity && item.unit_price
                ? Number(item.quantity) * Number(item.unit_price) : null;
              return (
                <View key={item.id || i}
                  style={[S.itemRow, { borderBottomColor: C.divider },
                    i < invoice.items!.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.itemName, { color: C.textPrimary }]}>{name}</Text>
                    <View style={S.metaChips}>
                      <View style={[S.chip, { backgroundColor: C.surfaceSoft }]}>
                        <Text style={[S.chipText, { color: C.textMuted }]}>Qty: {item.quantity} {item.unit || ''}</Text>
                      </View>
                      {item.unit_price ? (
                        <View style={[S.chip, { backgroundColor: C.surfaceSoft }]}>
                          <Text style={[S.chipText, { color: C.textMuted }]}>
                            {formatMoney(item.unit_price)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  {lineTotal != null ? (
                    <Text style={[S.itemTotal, { color: C.textPrimary }]}>{formatMoney(lineTotal)}</Text>
                  ) : null}
                </View>
              );
            })}
          </AppCard>
        ) : null}

        {/* Payment Summary */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Payment Summary</Text>
          {invoice.subtotal !== undefined ? (
            <AppCardRow label="Subtotal" value={formatMoney(invoice.subtotal)} />
          ) : null}
          {invoice.tax_amount !== undefined && invoice.tax_amount > 0 ? (
            <AppCardRow label={`Tax ${invoice.tax_rate ? `(${invoice.tax_rate}%)` : ''}`}
              value={formatMoney(invoice.tax_amount)} />
          ) : null}
          {totalAmt != null ? (
            <View style={[S.totalRow, { borderTopColor: C.primary }]}>
              <Text style={[S.totalLabel, { color: C.textPrimary }]}>Total</Text>
              <Text style={[S.totalValue, { color: C.primary }]}>{formatMoney(totalAmt)}</Text>
            </View>
          ) : null}
          {paidAmt != null && paidAmt > 0 ? (
            <AppCardRow label="Paid" value={formatMoney(paidAmt)} valueColor={C.success} />
          ) : null}
          {outstanding != null && outstanding > 0 ? (
            <AppCardRow label="Outstanding" value={formatMoney(outstanding)}
              valueColor={C.danger} last />
          ) : null}
        </AppCard>

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Fixed bottom action bar */}
      {hasActions ? (
        <View style={[S.bottomBar, { borderTopColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {showApproveReject && canApprove ? (
            <AppButton title="Approve" variant="primary" size="md"
              onPress={handleApprove} loading={approving} disabled={approving || rejecting}
              style={S.barBtn} />
          ) : null}
          {showApproveReject && canReject ? (
            <AppButton title="Reject" variant="dangerOutline" size="md"
              onPress={() => setRejectOpen(true)} disabled={approving || rejecting}
              style={S.barBtn} />
          ) : null}
          {showMarkPaid ? (
            <AppButton title="Mark as Paid" variant="successOutline" size="md"
              onPress={handleMarkPaid} loading={markingPaid} disabled={markingPaid}
              style={S.barBtn} />
          ) : null}
        </View>
      ) : null}

      <RejectionReasonDialog
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleRejectConfirm}
        loading={rejecting}
        title="Reject Invoice"
        message="Please provide a reason for rejecting this invoice."
      />
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    ...baseDetailStyles(C),
    content:      { padding: 16 },

    notesBox:     { marginTop: 10, padding: 12, borderRadius: 8 },
    notesText:    { fontSize: 13, lineHeight: 20 },

    linkRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
    linkLabel:    { fontSize: 13, fontWeight: '500' },
    linkValue:    { fontSize: 13, fontWeight: '600' },

    itemRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
    itemName:     { fontSize: 14, fontWeight: '600', marginBottom: 4 },
    metaChips:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    chip:         { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    chipText:     { fontSize: 12 },
    itemTotal:    { fontSize: 14, fontWeight: '700' },

    totalRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, marginTop: 4, borderTopWidth: 2 },
    totalLabel:   { fontSize: 15, fontWeight: '700' },
    totalValue:   { fontSize: 16, fontWeight: '800' },

    bottomBar: {
      flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: C.surface,
    },
    barBtn: { flex: 1 },
  });
}


export default function PurchaseInvoiceDetailScreen() {
  return (
    <AppPermissionGate category="purchase_invoice" action="view">
      <PurchaseInvoiceDetailScreenInner />
    </AppPermissionGate>
  );
}
