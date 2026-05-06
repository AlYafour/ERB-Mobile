import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { quotationRequestsApi } from '@/lib/api/quotation-requests';
import { toast } from '@/lib/hooks/use-toast';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { QuotationRequest } from '@/types';
import { Colors } from '@/constants/theme';

const C = Colors.light;

const statusVariant = (s?: string): 'success' | 'error' | 'warning' | 'info' =>
  s === 'completed' ? 'success' : s === 'cancelled' ? 'error' : 'warning';

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

export default function QuotationRequestDetailScreen() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const [request, setRequest] = useState<QuotationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { setLoading(true); setRequest(await quotationRequestsApi.getById(id)); }
    catch (e: any) { toast(e.message || 'Failed to load', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Quotation Request" showBack />
      <View style={S.center}><ActivityIndicator size="large" color={C.tint} /></View>
    </SafeAreaView>
  );

  if (!request) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Quotation Request" showBack />
      <View style={S.center}><Text style={S.errorText}>Request not found</Text></View>
    </SafeAreaView>
  );

  const r = request as any;
  const prNumber = typeof request.purchase_request === 'object' ? (request.purchase_request as any)?.request_number : null;
  const prId = typeof request.purchase_request === 'object' ? (request.purchase_request as any)?.id : null;
  const qrNum = request.request_number || `QR-${id}`;

  return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader
        title={qrNum}
        subtitle={request.status?.toUpperCase()}
        showBack
        rightElement={<Badge variant={statusVariant(request.status)}>{request.status || 'Pending'}</Badge>}
      />
      <ScrollView
        contentContainerStyle={S.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.tint} colors={[C.tint]} />}
        showsVerticalScrollIndicator={false}>

        {/* Request Info */}
        <Card padding={16} style={S.card}>
          <Text style={S.sectionTitle}>Request Information</Text>
          <Row label="Purchase Request" value={prNumber} onPress={prId ? () => router.push(`/purchase-requests/${prId}` as any) : undefined} />
          <Row label="Created" value={request.created_at ? new Date(request.created_at).toLocaleDateString('en-AE') : null} />
          {request.notes && <View style={S.notesBox}><Text style={S.notesText}>{request.notes}</Text></View>}
        </Card>

        {/* Suppliers */}
        {request.suppliers && Array.isArray(request.suppliers) && request.suppliers.length > 0 && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Requested Suppliers ({request.suppliers.length})</Text>
            {request.suppliers.map((supplier, i) => {
              const s = typeof supplier === 'object' ? supplier as any : { name: String(supplier) };
              return (
                <View key={i} style={[S.supplierRow, i < request.suppliers!.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.borderLight }]}>
                  <View style={[S.supplierAvatar, { backgroundColor: C.tintSubtle }]}>
                    <IconSymbol name="building.2.fill" size={16} color={C.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.supplierName}>{s.name || s.business_name || 'Unknown'}</Text>
                    {s.email && <Text style={S.supplierSub}>{s.email}</Text>}
                    {s.phone && <Text style={S.supplierSub}>{s.phone}</Text>}
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Next step: View Quotations */}
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/purchase-quotations?quotation_request=${id}` as any)}>
          <Card padding={16} style={[S.card, { backgroundColor: C.tintSubtle }]}>
            <View style={S.nextRow}>
              <View style={[S.nextIcon, { backgroundColor: C.tint }]}>
                <IconSymbol name="dollarsign.circle.fill" size={18} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.sectionTitle, { marginBottom: 2 }]}>View Quotations</Text>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>See supplier price offers for this request</Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={C.tint} />
            </View>
          </Card>
        </TouchableOpacity>

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
  supplierRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  supplierAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  supplierName: { fontSize: 14, fontWeight: '600', color: C.text },
  supplierSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
