import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseQuotationsApi } from '@/lib/api/purchase-quotations';
import { useAuth } from '@/contexts/AuthContext';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PurchaseQuotation } from '@/types';
import { Colors } from '@/constants/theme';

const C = Colors.light;

const statusVariant = (s?: string): 'success' | 'error' | 'warning' | 'info' =>
  s === 'accepted' || s === 'awarded' ? 'success' : s === 'rejected' ? 'error' : 'warning';

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

export default function PurchaseQuotationDetailScreen() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const [quotation, setQuotation] = useState<PurchaseQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const su = user?.is_superuser ?? false;
  const canAward = su || user?.role === 'procurement_officer';

  const load = async () => {
    try { setLoading(true); setQuotation(await purchaseQuotationsApi.getById(id)); }
    catch (e: any) { toast(e.message || 'Failed to load', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleAward = async () => {
    if (!await confirm('Award this quotation? This marks it as the selected supplier.')) return;
    try { setAwarding(true); await purchaseQuotationsApi.award(id); toast('Quotation awarded', 'success'); load(); }
    catch (e: any) { toast(e.message || 'Failed', 'error'); }
    finally { setAwarding(false); }
  };

  const handleReject = async () => {
    if (!await confirm('Reject this quotation?')) return;
    try { setRejecting(true); await purchaseQuotationsApi.reject(id); toast('Quotation rejected', 'success'); load(); }
    catch (e: any) { toast(e.message || 'Failed', 'error'); }
    finally { setRejecting(false); }
  };

  if (loading) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Purchase Quotation" showBack />
      <View style={S.center}><ActivityIndicator size="large" color={C.tint} /></View>
    </SafeAreaView>
  );

  if (!quotation) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Purchase Quotation" showBack />
      <View style={S.center}><Text style={S.errorText}>Quotation not found</Text></View>
    </SafeAreaView>
  );

  const q = quotation as any;
  const supplierName = typeof quotation.supplier === 'object' ? quotation.supplier?.name : null;
  const pqNum = quotation.quotation_number || `PQ-${id}`;

  return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader
        title={pqNum}
        subtitle={quotation.status?.toUpperCase()}
        showBack
        rightElement={<Badge variant={statusVariant(quotation.status)}>{quotation.status || 'Pending'}</Badge>}
      />
      <ScrollView
        contentContainerStyle={S.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.tint} colors={[C.tint]} />}
        showsVerticalScrollIndicator={false}>

        {/* Info */}
        <Card padding={16} style={S.card}>
          <Text style={S.sectionTitle}>Quotation Information</Text>
          <Row label="Supplier" value={supplierName} />
          <Row label="Quotation Date" value={quotation.quotation_date ? new Date(quotation.quotation_date).toLocaleDateString('en-AE') : null} />
          <Row label="Valid Until" value={quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-AE') : null} />
          <Row label="Payment Terms" value={quotation.payment_terms} />
          <Row label="Delivery Terms" value={quotation.delivery_terms} />
          {quotation.notes && <View style={S.notesBox}><Text style={S.notesText}>{quotation.notes}</Text></View>}
        </Card>

        {/* Items */}
        {quotation.items && quotation.items.length > 0 && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Items ({quotation.items.length})</Text>
            {quotation.items.map((item, i) => {
              const it = item as any;
              const name = typeof item.product === 'object' ? item.product?.name : it.product_name || 'N/A';
              return (
                <View key={item.id || i} style={[S.itemRow, i < quotation.items!.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.borderLight }]}>
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
        {quotation.total_amount !== undefined && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Summary</Text>
            {quotation.subtotal !== undefined && <Row label="Subtotal" value={`AED ${Number(quotation.subtotal).toFixed(2)}`} />}
            {quotation.tax_amount !== undefined && quotation.tax_amount > 0 && <Row label="Tax" value={`AED ${Number(quotation.tax_amount).toFixed(2)}`} />}
            <View style={S.totalRow}>
              <Text style={S.totalLabel}>Total</Text>
              <Text style={S.totalValue}>AED {Number(quotation.total_amount).toFixed(2)}</Text>
            </View>
          </Card>
        )}

        {/* Award actions */}
        {quotation.status === 'pending' && canAward && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Actions</Text>
            <Text style={{ fontSize: 12, color: C.textSecondary, marginBottom: 12 }}>Award this quotation to proceed with creating an LPO for this supplier.</Text>
            <View style={S.actionRow}>
              <Button title={awarding ? 'Processing...' : 'Award Quotation'} variant="primary" onPress={handleAward} disabled={awarding} loading={awarding} style={{ flex: 1 }} />
              <Button title={rejecting ? 'Processing...' : 'Reject'} variant="danger" onPress={handleReject} disabled={rejecting} loading={rejecting} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {/* Awarded: next step create LPO */}
        {quotation.status === 'awarded' && (
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/purchase-orders/new?purchase_quotation_id=${id}` as any)}>
            <Card padding={16} style={[S.card, { backgroundColor: C.successLight }]}>
              <View style={S.nextRow}>
                <View style={[S.nextIcon, { backgroundColor: C.success }]}>
                  <IconSymbol name="doc.text.fill" size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.sectionTitle, { marginBottom: 2, color: C.success }]}>Next Step: Create LPO</Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary }}>Issue a Local Purchase Order for this awarded supplier</Text>
                </View>
                <IconSymbol name="chevron.right" size={18} color={C.success} />
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
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  itemName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 4 },
  itemMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: { fontSize: 12, color: C.textSecondary, backgroundColor: C.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: C.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, marginTop: 4, borderTopWidth: 2, borderTopColor: C.tint },
  totalLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: C.tint },
  actionRow: { flexDirection: 'row', gap: 10 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
