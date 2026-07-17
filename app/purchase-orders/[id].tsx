import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard, AppCardRow } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import RejectionReasonDialog from '@/components/ui/RejectionReasonDialog';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PurchaseOrder } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';

type AppColors = typeof Colors.light | typeof Colors.dark;

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function getStatusVariant(s?: string): 'success' | 'danger' | 'warning' | 'info' {
  switch (s) {
    case 'approved': case 'completed': return 'success';
    case 'rejected': case 'cancelled': return 'danger';
    case 'pending':  return 'warning';
    default:         return 'info';
  }
}

function PurchaseOrderDetailScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const insets = useSafeAreaInsets();

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Permission-based, matching the web (purchase-orders/[id]/page.tsx) —
  // the last remaining hardcoded-role bypass (procurement_officer) removed.
  const canApprove = hasPermission('purchase_order', 'approve');
  const canReject  = hasPermission('purchase_order', 'reject');
  const canCancel  = hasPermission('purchase_order', 'cancel');
  const canReopen  = hasPermission('purchase_order', 'reopen');

  const load = async () => {
    try {
      setLoading(true);
      setOrder(await purchaseOrdersApi.getById(id));
    } catch (e: any) {
      toast(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  // Stale-detail fix: refetch when the screen regains focus (a child
  // flow - create QR/PO/GRN/invoice, approve, edit - can change this
  // document's state while this screen stays mounted underneath).
  useRefetchOnFocus(load);

  const handleApprove = async () => {
    const orderNum = (order as any)?.order_number || `LPO-${id}`;
    if (!await confirm(`Approve ${orderNum}?\n\nThis will mark the purchase order as approved.`)) return;
    try {
      setApproving(true);
      await purchaseOrdersApi.approve(id);
      toast('Order approved successfully', 'success');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to approve', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    try {
      setRejecting(true);
      await purchaseOrdersApi.reject(id, reason);
      toast('Order rejected', 'info');
      setRejectOpen(false);
      load();
    } catch (e: any) {
      toast(e?.response?.data?.error || e.message || 'Failed to reject', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const handleCancel = async () => {
    if (!await confirm('Cancel this purchase order?\n\nThis action cannot be undone.')) return;
    try {
      setCancelling(true);
      await purchaseOrdersApi.cancel(id);
      toast('Order cancelled', 'info');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to cancel', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleReopen = async () => {
    if (!await confirm('Reopen this cancelled order?')) return;
    try {
      setReopening(true);
      await purchaseOrdersApi.reopen(id);
      toast('Order reopened', 'success');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to reopen', 'error');
    } finally {
      setReopening(false);
    }
  };

  const S = makeStyles(C);
  const showApproveRejectBar = !loading && !!order && order.status === 'pending' && (canApprove || canReject);
  const showCancelBar = !loading && !!order && (order.status === 'pending' || order.status === 'approved') && canCancel;
  const showReopenBar = !loading && !!order && order.status === 'cancelled' && canReopen;
  const showBottomBar = showApproveRejectBar || showCancelBar || showReopenBar;

  if (loading && !order) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Purchase Order" showBack />
      <View style={S.center}>
        <AppEmptyState variant="loading" title="Loading order..." />
      </View>
    </SafeAreaView>
  );

  if (!order) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Purchase Order" showBack />
      <View style={S.center}>
        <AppEmptyState variant="empty" title="Order not found" />
      </View>
    </SafeAreaView>
  );

  const o = order as any;
  const supplierName = typeof order.supplier === 'object' ? (order.supplier as any)?.name : o.supplier_name || null;
  const projectName  = typeof o.project === 'object' ? o.project?.name : o.project_name || null;
  const orderNum     = order.order_number || `LPO-${id}`;

  const orderDate    = order.order_date ? new Date(order.order_date).toLocaleDateString('en-AE', { year: 'numeric', month: 'short', day: 'numeric' }) : null;
  const deliveryDate = order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-AE', { year: 'numeric', month: 'short', day: 'numeric' }) : null;

  const now          = new Date();
  const delivRaw     = order.delivery_date ? new Date(order.delivery_date) : null;
  const isActive     = order.status !== 'completed' && order.status !== 'rejected' && order.status !== 'cancelled';
  const isOverdue    = delivRaw && isActive && delivRaw < now;
  const isUrgent     = delivRaw && isActive && delivRaw < new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const delivColor   = isOverdue ? C.danger : isUrgent ? C.warning : undefined;

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader
        title={orderNum}
        subtitle={(statusLabels[order.status || ''] || order.status || 'Unknown').toUpperCase()}
        showBack
        right={
          <AppBadge variant={getStatusVariant(order.status)}>
            {statusLabels[order.status || ''] || order.status || 'Unknown'}
          </AppBadge>
        }
      />

      <ScrollView
        contentContainerStyle={[S.content, showBottomBar && { paddingBottom: 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Order Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Order Information</Text>
          <AppCardRow label="Supplier" value={supplierName} />
          <AppCardRow label="Project" value={projectName} />
          <AppCardRow label="Order Date" value={orderDate} />
          <AppCardRow
            label="Delivery Date"
            value={deliveryDate ? `${deliveryDate}${isOverdue ? ' · Overdue' : isUrgent ? ' · Soon' : ''}` : null}
            valueColor={delivColor}
          />
          <AppCardRow label="Payment Terms" value={order.payment_terms} />
          <AppCardRow label="Delivery Terms" value={order.delivery_terms} />
          {o.purchase_request_number ? (
            <TouchableOpacity
              onPress={() => router.push(`/purchase-requests/${o.purchase_request_id}` as any)}
              style={S.linkRow}
            >
              <Text style={[S.linkRowLabel, { color: C.textMuted }]}>Purchase Request</Text>
              <Text style={[S.linkRowValue, { color: C.primary }]}>
                {o.purchase_request_number} →
              </Text>
            </TouchableOpacity>
          ) : null}
          {order.notes ? (
            <View style={[S.notesBox, { backgroundColor: C.surfaceSoft }]}>
              <Text style={[S.notesText, { color: C.textSecondary }]}>{order.notes}</Text>
            </View>
          ) : null}
          {o.rejection_reason ? (
            <View style={[S.rejectionBox, { backgroundColor: C.dangerBg, borderColor: C.danger }]}>
              <Text style={[S.rejectionLabel, { color: C.danger }]}>Rejection Reason</Text>
              <Text style={[S.rejectionText, { color: C.danger }]}>{o.rejection_reason}</Text>
            </View>
          ) : null}
        </AppCard>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Items ({order.items.length})</Text>
            {order.items.map((item, i) => {
              const it = item as any;
              const name = typeof item.product === 'object' ? (item.product as any)?.name : it.product_name || 'N/A';
              const isLast = i === order.items!.length - 1;
              return (
                <View
                  key={item.id || i}
                  style={[S.itemRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider }]}
                >
                  <View style={[S.itemBadge, { backgroundColor: C.primarySoft }]}>
                    <Text style={[S.itemBadgeText, { color: C.primary }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.itemName, { color: C.textPrimary }]} numberOfLines={2}>{name}</Text>
                    <View style={S.itemMeta}>
                      <Text style={[S.metaChip, { color: C.textSecondary, backgroundColor: C.surfaceSoft }]}>
                        Qty: {item.quantity} {item.unit || ''}
                      </Text>
                      {item.unit_price ? (
                        <Text style={[S.metaChip, { color: C.textSecondary, backgroundColor: C.surfaceSoft }]}>
                          Unit: AED {Number(item.unit_price).toFixed(2)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {item.total ? (
                    <Text style={[S.itemTotal, { color: C.textPrimary }]}>
                      AED {Number(item.total).toFixed(2)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </AppCard>
        )}

        {/* Totals Summary */}
        {(order.subtotal !== undefined || order.tax_amount !== undefined || order.total_amount !== undefined) && (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Summary</Text>
            {order.subtotal !== undefined && (
              <AppCardRow label="Subtotal" value={`AED ${Number(order.subtotal).toFixed(2)}`} />
            )}
            {order.tax_amount !== undefined && Number(order.tax_amount) > 0 && (
              <AppCardRow label="Tax" value={`AED ${Number(order.tax_amount).toFixed(2)}`} />
            )}
            {order.total_amount !== undefined && (
              <View style={[S.totalRow, { borderTopColor: C.primary }]}>
                <Text style={[S.totalLabel, { color: C.textPrimary }]}>Total</Text>
                <Text style={[S.totalValue, { color: C.primary }]}>
                  AED {Number(order.total_amount).toFixed(2)}
                </Text>
              </View>
            )}
          </AppCard>
        )}

        {/* Next Step: Create GRN — permission-gated like the web */}
        {order.status === 'approved' && hasPermission('goods_receiving', 'create') && (
          <AppCard
            style={[S.card, { backgroundColor: C.successBg }]}
            onPress={() => router.push(`/goods-receiving/new?purchase_order_id=${id}` as any)}
          >
            <View style={S.nextStepRow}>
              <View style={[S.nextStepIcon, { backgroundColor: C.success }]}>
                <IconSymbol name="shippingbox.fill" size={18} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.sectionTitle, { marginBottom: 2, color: C.success }]}>Next Step: Create GRN</Text>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>
                  Record goods received against this LPO
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={C.success} />
            </View>
          </AppCard>
        )}

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Fixed bottom action bar */}
      {showBottomBar && (
        <View style={[S.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: C.border, backgroundColor: C.surface }]}>
          {showApproveRejectBar && canApprove && (
            <AppButton
              title="Approve"
              variant="successOutline"
              size="md"
              onPress={handleApprove}
              disabled={approving || rejecting}
              loading={approving}
              style={{ flex: 1 }}
            />
          )}
          {showApproveRejectBar && canReject && (
            <AppButton
              title="Reject"
              variant="dangerOutline"
              size="md"
              onPress={() => setRejectOpen(true)}
              disabled={approving || rejecting}
              style={{ flex: 1 }}
            />
          )}
          {showCancelBar && (
            <AppButton
              title="Cancel Order"
              variant="dangerOutline"
              size="md"
              onPress={handleCancel}
              disabled={cancelling}
              loading={cancelling}
              style={{ flex: 1 }}
            />
          )}
          {showReopenBar && (
            <AppButton
              title="Reopen Order"
              variant="primary"
              size="md"
              onPress={handleReopen}
              disabled={reopening}
              loading={reopening}
              style={{ flex: 1 }}
            />
          )}
        </View>
      )}

      <RejectionReasonDialog
        isOpen={rejectOpen}
        onClose={() => { if (!rejecting) setRejectOpen(false); }}
        onConfirm={handleRejectConfirm}
        loading={rejecting}
        title="Reject Purchase Order"
        message="Please provide a reason for rejecting this order."
      />
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content:   { padding: 16, paddingBottom: 24 },
    card:      { marginBottom: 12 },

    sectionTitle: {
      fontSize: 15, fontWeight: '700', color: C.textPrimary,
      marginBottom: 14, letterSpacing: -0.2,
    },

    linkRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider,
    },
    linkRowLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
    linkRowValue: { fontSize: 13, fontWeight: '600', flex: 1.2, textAlign: 'right' },

    notesBox: { marginTop: 10, padding: 12, borderRadius: 8 },
    notesText: { fontSize: 13, lineHeight: 20 },

    rejectionBox: {
      marginTop: 10, padding: 12, borderRadius: 8,
      borderWidth: 1,
    },
    rejectionLabel: {
      fontSize: 11, fontWeight: '700', marginBottom: 4,
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
    rejectionText: { fontSize: 13 },

    itemRow: {
      flexDirection: 'row', alignItems: 'center',
      gap: 10, paddingVertical: 12,
    },
    itemBadge: {
      width: 24, height: 24, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    itemBadgeText: { fontSize: 11, fontWeight: '700' },
    itemName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
    itemMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    metaChip: {
      fontSize: 12, paddingHorizontal: 8,
      paddingVertical: 2, borderRadius: 10,
    },
    itemTotal: { fontSize: 14, fontWeight: '700' },

    totalRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      paddingVertical: 10, marginTop: 6,
      borderTopWidth: 2,
    },
    totalLabel: { fontSize: 15, fontWeight: '700' },
    totalValue: { fontSize: 16, fontWeight: '800' },

    nextStepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    nextStepIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },

    bottomBar: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: 12, paddingHorizontal: 16,
      flexDirection: 'row', gap: 12,
    },
  });
}


export default function PurchaseOrderDetailScreen() {
  return (
    <AppPermissionGate category="purchase_order" action="view">
      <PurchaseOrderDetailScreenInner />
    </AppPermissionGate>
  );
}
