import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goodsReceivingApi, GoodsReceivedNote } from '@/lib/api/goods-receiving';
import { useAuth } from '@/contexts/AuthContext';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

const C = Colors.light;

const qualityVariant = (s?: string): 'success' | 'error' | 'warning' | 'info' =>
  s === 'good' ? 'success' : s === 'defective' || s === 'missing' ? 'error' : 'warning';

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

export default function GoodsReceivingDetailScreen() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const [grn, setGrn] = useState<GoodsReceivedNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);

  const load = async () => {
    try { setLoading(true); setGrn(await goodsReceivingApi.getById(id)); }
    catch (e: any) { toast(e.message || 'Failed to load', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleMarkDelivered = async () => {
    if (!await confirm('Mark supplier invoice as delivered?')) return;
    try { setMarkingDelivered(true); await goodsReceivingApi.markInvoiceDelivered(id); toast('Invoice marked as delivered', 'success'); load(); }
    catch (e: any) { toast(e.message || 'Failed', 'error'); }
    finally { setMarkingDelivered(false); }
  };

  if (loading) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Goods Receiving" showBack />
      <View style={S.center}><ActivityIndicator size="large" color={C.tint} /></View>
    </SafeAreaView>
  );

  if (!grn) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Goods Receiving" showBack />
      <View style={S.center}><Text style={S.errorText}>GRN not found</Text></View>
    </SafeAreaView>
  );

  const poNumber = typeof grn.purchase_order === 'object' ? (grn.purchase_order as any)?.order_number : null;
  const poId = typeof grn.purchase_order === 'object' ? (grn.purchase_order as any)?.id : grn.purchase_order_id;
  const grnNum = grn.grn_number || `GRN-${id}`;
  const statusVariant = (s: string): 'success' | 'warning' | 'error' | 'info' =>
    s === 'completed' ? 'success' : s === 'cancelled' ? 'error' : s === 'partial' ? 'warning' : 'info';

  return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader
        title={grnNum}
        subtitle={grn.status?.toUpperCase()}
        showBack
        rightElement={<Badge variant={statusVariant(grn.status)}>{grn.status || 'Draft'}</Badge>}
      />
      <ScrollView
        contentContainerStyle={S.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.tint} colors={[C.tint]} />}
        showsVerticalScrollIndicator={false}>

        {/* GRN Info */}
        <Card padding={16} style={S.card}>
          <Text style={S.sectionTitle}>GRN Information</Text>
          <Row label="Purchase Order" value={poNumber} onPress={poId ? () => router.push(`/purchase-orders/${poId}` as any) : undefined} />
          <Row label="Receipt Date" value={grn.receipt_date ? new Date(grn.receipt_date).toLocaleDateString('en-AE') : null} />
          <Row label="Received By" value={grn.received_by_name} />
          {grn.total_items !== undefined && <Row label="Total Items" value={String(grn.total_items)} />}
          {grn.total_received_quantity !== undefined && <Row label="Total Received Qty" value={String(grn.total_received_quantity)} />}
          {grn.notes && <View style={S.notesBox}><Text style={S.notesText}>{grn.notes}</Text></View>}
        </Card>

        {/* Invoice Delivery Status */}
        {grn.invoice_delivery_status && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Invoice Delivery</Text>
            <View style={S.invoiceStatusRow}>
              <Text style={S.rowLabel}>Status</Text>
              <Badge variant={grn.invoice_delivery_status === 'delivered' ? 'success' : 'warning'}>
                {grn.invoice_delivery_status === 'delivered' ? 'Delivered' : 'Not Delivered'}
              </Badge>
            </View>
          </Card>
        )}

        {/* Items */}
        {grn.items && grn.items.length > 0 && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Received Items ({grn.items.length})</Text>
            {grn.items.map((item, i) => {
              const name = typeof item.product === 'object' ? item.product?.name : 'N/A';
              return (
                <View key={item.id || i} style={[S.itemRow, i < grn.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.borderLight }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={S.itemName}>{name}</Text>
                    <View style={S.qtyRow}>
                      <View style={S.qtyBox}>
                        <Text style={S.qtyLabel}>Ordered</Text>
                        <Text style={S.qtyValue}>{item.ordered_quantity}</Text>
                      </View>
                      <View style={[S.qtyBox, { backgroundColor: C.successLight }]}>
                        <Text style={S.qtyLabel}>Received</Text>
                        <Text style={[S.qtyValue, { color: C.success }]}>{item.received_quantity}</Text>
                      </View>
                      {item.rejected_quantity > 0 && (
                        <View style={[S.qtyBox, { backgroundColor: C.errorLight }]}>
                          <Text style={S.qtyLabel}>Rejected</Text>
                          <Text style={[S.qtyValue, { color: C.error }]}>{item.rejected_quantity}</Text>
                        </View>
                      )}
                    </View>
                    {item.quality_status && (
                      <View style={{ marginTop: 6 }}>
                        <Badge variant={qualityVariant(item.quality_status)}>{item.quality_status.toUpperCase()}</Badge>
                      </View>
                    )}
                    {item.notes && <Text style={S.itemNote}>{item.notes}</Text>}
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Mark invoice delivered */}
        {grn.invoice_delivery_status === 'not_delivered' && (
          <Card padding={16} style={S.card}>
            <Button title={markingDelivered ? 'Processing...' : 'Mark Invoice as Delivered'} variant="primary" onPress={handleMarkDelivered} disabled={markingDelivered} loading={markingDelivered} />
          </Card>
        )}

        {/* Next step: Create Invoice */}
        {(grn.status === 'completed' || grn.status === 'partial') && (
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/purchase-invoices/new?goods_receiving_id=${id}&purchase_order_id=${poId}` as any)}>
            <Card padding={16} style={[S.card, { backgroundColor: C.tintSubtle }]}>
              <View style={S.nextRow}>
                <View style={[S.nextIcon, { backgroundColor: C.tint }]}>
                  <IconSymbol name="doc.fill" size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.sectionTitle, { marginBottom: 2 }]}>Next Step: Create Invoice</Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary }}>Create a purchase invoice for these received goods</Text>
                </View>
                <IconSymbol name="chevron.right" size={18} color={C.tint} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        <View style={{ height: 8 }} />
      </ScrollView>
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
  invoiceStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  itemRow: { paddingVertical: 12 },
  itemName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8 },
  qtyRow: { flexDirection: 'row', gap: 8 },
  qtyBox: { flex: 1, backgroundColor: C.backgroundSecondary, borderRadius: 8, padding: 8, alignItems: 'center' },
  qtyLabel: { fontSize: 10, color: C.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  qtyValue: { fontSize: 16, fontWeight: '700', color: C.text },
  itemNote: { fontSize: 12, color: C.textTertiary, marginTop: 6 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
