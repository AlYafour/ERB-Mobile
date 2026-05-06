import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import RejectionReasonDialog from '@/components/ui/RejectionReasonDialog';
import { PurchaseOrder } from '@/types';
import { Colors } from '@/constants/theme';

const C = Colors.light;

const statusVariant = (s?: string): 'success' | 'error' | 'warning' | 'info' =>
  s === 'approved' || s === 'completed' ? 'success' : s === 'rejected' || s === 'cancelled' ? 'error' : s === 'pending' ? 'warning' : 'info';

function Row({ label, value, onPress }: { label: string; value?: string | null; onPress?: () => void }) {
  if (!value) return null;
  return (
    <View style={S.row}>
      <Text style={S.rowLabel}>{label}</Text>
      {onPress ? <TouchableOpacity onPress={onPress}><Text style={[S.rowValue, S.link]}>{value}</Text></TouchableOpacity>
        : <Text style={S.rowValue}>{value}</Text>}
    </View>
  );
}

export default function PurchaseOrderDetailScreen() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  const su = user?.is_superuser ?? false;
  const canApprove = su || (hasPermission('purchase_order', 'approve') ?? false);
  const canReject = su || (hasPermission('purchase_order', 'reject') ?? false);
  const isProcurement = user?.role === 'procurement_officer' || user?.role === 'super_admin' || su;

  const load = async () => {
    try { setLoading(true); setOrder(await purchaseOrdersApi.getById(id)); }
    catch (e: any) { toast(e.message || 'Failed to load', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleApprove = async () => {
    if (!await confirm('Approve this purchase order?')) return;
    try { setApproving(true); await purchaseOrdersApi.approve(id); toast('Approved', 'success'); load(); }
    catch (e: any) { toast(e.message || 'Failed to approve', 'error'); }
    finally { setApproving(false); }
  };

  const handleReject = (reason: string) => {
    purchaseOrdersApi.reject(id, reason)
      .then(() => { toast('Rejected', 'success'); setRejectOpen(false); load(); })
      .catch((e: any) => { toast(e.message || 'Failed to reject', 'error'); });
  };

  if (loading) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Purchase Order" showBack />
      <View style={S.center}><ActivityIndicator size="large" color={C.tint} /></View>
    </SafeAreaView>
  );

  if (!order) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Purchase Order" showBack />
      <View style={S.center}><Text style={S.errorText}>Order not found</Text></View>
    </SafeAreaView>
  );

  const o = order as any;
  const supplierName = typeof order.supplier === 'object' ? order.supplier?.name : null;
  const orderNum = order.order_number || `LPO-${id}`;

  return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader
        title={orderNum}
        subtitle={order.status?.toUpperCase()}
        showBack
        rightElement={<Badge variant={statusVariant(order.status)}>{order.status || 'Unknown'}</Badge>}
      />
      <ScrollView
        contentContainerStyle={S.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.tint} colors={[C.tint]} />}
        showsVerticalScrollIndicator={false}>

        {/* Order Info */}
        <Card padding={16} style={S.card}>
          <Text style={S.sectionTitle}>Order Information</Text>
          <Row label="Supplier" value={supplierName} />
          <Row label="Order Date" value={order.order_date ? new Date(order.order_date).toLocaleDateString('en-AE') : null} />
          <Row label="Delivery Date" value={order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-AE') : null} />
          <Row label="Payment Terms" value={order.payment_terms} />
          <Row label="Delivery Terms" value={order.delivery_terms} />
          {o.purchase_request_number && (
            <Row label="Purchase Request" value={o.purchase_request_number}
              onPress={() => router.push(`/purchase-requests/${o.purchase_request_id}` as any)} />
          )}
          {order.notes && <View style={S.notesBox}><Text style={S.notesText}>{order.notes}</Text></View>}
        </Card>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Items ({order.items.length})</Text>
            {order.items.map((item, i) => {
              const it = item as any;
              const name = typeof item.product === 'object' ? item.product?.name : it.product_name || 'N/A';
              return (
                <View key={item.id || i} style={[S.itemRow, i < order.items!.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.borderLight }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={S.itemName}>{name}</Text>
                    <View style={S.itemMeta}>
                      <Text style={S.metaChip}>Qty: {item.quantity} {item.unit || ''}</Text>
                      {item.unit_price && <Text style={S.metaChip}>Unit: AED {Number(item.unit_price).toFixed(2)}</Text>}
                    </View>
                  </View>
                  {item.total && <Text style={S.itemTotal}>AED {Number(item.total).toFixed(2)}</Text>}
                </View>
              );
            })}
          </Card>
        )}

        {/* Totals */}
        {(order.subtotal || order.tax_amount || order.total_amount) && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Summary</Text>
            {order.subtotal !== undefined && <Row label="Subtotal" value={`AED ${Number(order.subtotal).toFixed(2)}`} />}
            {order.tax_amount !== undefined && order.tax_amount > 0 && <Row label="Tax" value={`AED ${Number(order.tax_amount).toFixed(2)}`} />}
            {order.total_amount !== undefined && (
              <View style={S.totalRow}>
                <Text style={S.totalLabel}>Total</Text>
                <Text style={S.totalValue}>AED {Number(order.total_amount).toFixed(2)}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Actions */}
        {order.status === 'pending' && (canApprove || canReject) && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Actions</Text>
            <View style={S.actionRow}>
              {canApprove && <Button title={approving ? 'Processing...' : 'Approve'} variant="primary" onPress={handleApprove} disabled={approving} loading={approving} style={{ flex: 1 }} />}
              {canReject && <Button title="Reject" variant="danger" onPress={() => setRejectOpen(true)} style={{ flex: 1 }} />}
            </View>
          </Card>
        )}

        {/* Next Step: Create GRN */}
        {order.status === 'approved' && isProcurement && (
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/goods-receiving/new?purchase_order_id=${id}` as any)}>
            <Card padding={16} style={[S.card, { backgroundColor: C.successLight }]}>
              <View style={S.nextStepRow}>
                <View style={[S.nextIcon, { backgroundColor: C.success }]}>
                  <IconSymbol name="shippingbox.fill" size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.sectionTitle, { marginBottom: 2, color: C.success }]}>Next Step: Create GRN</Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary }}>Record goods received against this LPO</Text>
                </View>
                <IconSymbol name="chevron.right" size={18} color={C.success} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        <View style={{ height: 8 }} />
      </ScrollView>

      <RejectionReasonDialog isOpen={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={handleReject} title="Reject Purchase Order" message="Please provide a rejection reason." />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, color: C.error },
  content: { padding: 16, paddingBottom: 24 },
  card: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14, letterSpacing: -0.2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  rowLabel: { fontSize: 13, color: C.textSecondary, fontWeight: '500', flex: 1 },
  rowValue: { fontSize: 13, color: C.text, fontWeight: '500', flex: 1.2, textAlign: 'right' },
  link: { color: C.tint, textDecorationLine: 'underline' },
  notesBox: { marginTop: 10, padding: 12, backgroundColor: C.backgroundSecondary, borderRadius: 8 },
  notesText: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  itemName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 4 },
  itemMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: { fontSize: 12, color: C.textSecondary, backgroundColor: C.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: C.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, marginTop: 4, borderTopWidth: 2, borderTopColor: C.tint },
  totalLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: C.tint },
  actionRow: { flexDirection: 'row', gap: 10 },
  nextStepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
