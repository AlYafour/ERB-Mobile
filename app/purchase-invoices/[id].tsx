import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseInvoicesApi } from '@/lib/api/purchase-invoices';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import RejectionReasonDialog from '@/components/ui/RejectionReasonDialog';
import { PurchaseInvoice } from '@/types';
import { Colors } from '@/constants/theme';

const C = Colors.light;

const statusVariant = (s?: string): 'success' | 'error' | 'warning' | 'info' =>
  s === 'approved' || s === 'paid' ? 'success' : s === 'rejected' || s === 'cancelled' ? 'error' : s === 'pending' ? 'warning' : 'info';

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

export default function PurchaseInvoiceDetailScreen() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const su = user?.is_superuser ?? false;
  const canApprove = su || (hasPermission('purchase_invoice', 'approve') ?? false);
  const canReject = su || (hasPermission('purchase_invoice', 'reject') ?? false);
  const canMarkPaid = su || (hasPermission('purchase_invoice', 'mark_paid') ?? false);

  const load = async () => {
    try { setLoading(true); setInvoice(await purchaseInvoicesApi.getById(id)); }
    catch (e: any) { toast(e.message || 'Failed to load', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleApprove = async () => {
    if (!await confirm('Approve this invoice?')) return;
    try { setApproving(true); await purchaseInvoicesApi.approve(id); toast('Invoice approved', 'success'); load(); }
    catch (e: any) { toast(e.message || 'Failed', 'error'); }
    finally { setApproving(false); }
  };

  const handleReject = (reason: string) => {
    purchaseInvoicesApi.reject(id, reason)
      .then(() => { toast('Invoice rejected', 'success'); setRejectOpen(false); load(); })
      .catch((e: any) => { toast(e.message || 'Failed', 'error'); });
  };

  const handleMarkPaid = async () => {
    if (!await confirm('Mark this invoice as paid?')) return;
    try {
      setMarkingPaid(true);
      await purchaseInvoicesApi.markPaid(id, { paid_amount: invoice?.total_amount, payment_date: new Date().toISOString().split('T')[0] });
      toast('Invoice marked as paid', 'success'); load();
    } catch (e: any) { toast(e.message || 'Failed', 'error'); }
    finally { setMarkingPaid(false); }
  };

  if (loading) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Purchase Invoice" showBack />
      <View style={S.center}><ActivityIndicator size="large" color={C.tint} /></View>
    </SafeAreaView>
  );

  if (!invoice) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Purchase Invoice" showBack />
      <View style={S.center}><Text style={S.errorText}>Invoice not found</Text></View>
    </SafeAreaView>
  );

  const inv = invoice as any;
  const supplierName = typeof invoice.supplier === 'object' ? invoice.supplier?.name : null;
  const poNumber = typeof invoice.purchase_order === 'object' ? invoice.purchase_order?.order_number : null;
  const poId = typeof invoice.purchase_order === 'object' ? (invoice.purchase_order as any)?.id : null;
  const invoiceNum = invoice.invoice_number || `INV-${id}`;

  return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader
        title={invoiceNum}
        subtitle={invoice.status?.toUpperCase()}
        showBack
        rightElement={<Badge variant={statusVariant(invoice.status)}>{invoice.status || 'Unknown'}</Badge>}
      />
      <ScrollView
        contentContainerStyle={S.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.tint} colors={[C.tint]} />}
        showsVerticalScrollIndicator={false}>

        {/* Invoice Info */}
        <Card padding={16} style={S.card}>
          <Text style={S.sectionTitle}>Invoice Information</Text>
          <Row label="Supplier" value={supplierName} />
          <Row label="Purchase Order" value={poNumber} onPress={poId ? () => router.push(`/purchase-orders/${poId}` as any) : undefined} />
          <Row label="Invoice Date" value={invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-AE') : null} />
          <Row label="Due Date" value={invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-AE') : null} />
          {invoice.notes && <View style={S.notesBox}><Text style={S.notesText}>{invoice.notes}</Text></View>}
        </Card>

        {/* Items */}
        {invoice.items && invoice.items.length > 0 && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Items ({invoice.items.length})</Text>
            {invoice.items.map((item, i) => {
              const it = item as any;
              const name = typeof item.product === 'object' ? item.product?.name : it.product_name || 'N/A';
              return (
                <View key={item.id || i} style={[S.itemRow, i < invoice.items!.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.borderLight }]}>
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
        <Card padding={16} style={S.card}>
          <Text style={S.sectionTitle}>Payment Summary</Text>
          {invoice.subtotal !== undefined && <Row label="Subtotal" value={`AED ${Number(invoice.subtotal).toFixed(2)}`} />}
          {invoice.tax_amount !== undefined && invoice.tax_amount > 0 && <Row label="Tax" value={`AED ${Number(invoice.tax_amount).toFixed(2)}`} />}
          {invoice.total_amount !== undefined && (
            <View style={S.totalRow}>
              <Text style={S.totalLabel}>Total</Text>
              <Text style={S.totalValue}>AED {Number(invoice.total_amount).toFixed(2)}</Text>
            </View>
          )}
          {inv.paid_amount !== undefined && inv.paid_amount > 0 && (
            <View style={[S.row, { borderBottomWidth: 0 }]}>
              <Text style={S.rowLabel}>Paid</Text>
              <Text style={[S.rowValue, { color: C.success, fontWeight: '700' }]}>AED {Number(inv.paid_amount).toFixed(2)}</Text>
            </View>
          )}
          {invoice.total_amount !== undefined && inv.paid_amount !== undefined && Number(invoice.total_amount) > Number(inv.paid_amount) && (
            <View style={[S.row, { borderBottomWidth: 0 }]}>
              <Text style={S.rowLabel}>Outstanding</Text>
              <Text style={[S.rowValue, { color: C.error, fontWeight: '700' }]}>AED {(Number(invoice.total_amount) - Number(inv.paid_amount)).toFixed(2)}</Text>
            </View>
          )}
        </Card>

        {/* Actions */}
        {invoice.status === 'pending' && (canApprove || canReject) && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Actions</Text>
            <View style={S.actionRow}>
              {canApprove && <Button title={approving ? 'Processing...' : 'Approve'} variant="primary" onPress={handleApprove} disabled={approving} loading={approving} style={{ flex: 1 }} />}
              {canReject && <Button title="Reject" variant="danger" onPress={() => setRejectOpen(true)} style={{ flex: 1 }} />}
            </View>
          </Card>
        )}

        {invoice.status === 'approved' && canMarkPaid && (
          <Card padding={16} style={[S.card, { backgroundColor: C.successLight }]}>
            <Text style={[S.sectionTitle, { color: C.success, marginBottom: 10 }]}>Mark as Paid</Text>
            <Button title={markingPaid ? 'Processing...' : 'Mark Invoice as Paid'} variant="primary" onPress={handleMarkPaid} disabled={markingPaid} loading={markingPaid} />
          </Card>
        )}

        <View style={{ height: 8 }} />
      </ScrollView>

      <RejectionReasonDialog isOpen={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={handleReject} title="Reject Invoice" message="Please provide a rejection reason." />
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
});
