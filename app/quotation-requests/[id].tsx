import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { quotationRequestsApi } from '@/lib/api/quotation-requests';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard, AppCardRow } from '@/components/ui/AppCard';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { QuotationRequest } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';

type AppColors = typeof Colors.light | typeof Colors.dark;

function getStatusVariant(s?: string): 'success' | 'danger' | 'warning' | 'info' | 'default' {
  switch (s) {
    case 'completed': return 'success';
    case 'cancelled': return 'danger';
    case 'pending':   return 'warning';
    default:          return 'default';
  }
}

function QuotationRequestDetailScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const S = makeStyles(C);

  const [request, setRequest] = useState<QuotationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { setLoading(true); setRequest(await quotationRequestsApi.getById(id)); }
    catch (e: any) { toast(e.message || 'Failed to load', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading && !request) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Quotation Request" showBack />
      <View style={S.center}><AppEmptyState variant="loading" title="Loading request..." /></View>
    </SafeAreaView>
  );

  if (!request) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Quotation Request" showBack />
      <View style={S.center}><AppEmptyState variant="empty" title="Request not found" /></View>
    </SafeAreaView>
  );

  const prNumber = typeof request.purchase_request === 'object'
    ? (request.purchase_request as any)?.request_number || (request.purchase_request as any)?.code
    : null;
  const prId = typeof request.purchase_request === 'object'
    ? (request.purchase_request as any)?.id
    : null;
  const qrNum = (request as any).request_number || `QR-${id}`;
  const createdDate = request.created_at
    ? new Date(request.created_at).toLocaleDateString('en-AE')
    : null;
  const statusLabel = request.status
    ? request.status.charAt(0).toUpperCase() + request.status.slice(1)
    : 'Pending';

  return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader
        title={qrNum}
        showBack
        right={<AppBadge variant={getStatusVariant(request.status)}>{statusLabel}</AppBadge>}
      />
      <ScrollView
        contentContainerStyle={S.content}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.primary} colors={[C.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Request Info */}
        <AppCard style={S.card}>
          <Text style={[S.sectionTitle, { color: C.textPrimary }]}>Request Information</Text>
          {prNumber ? (
            <TouchableOpacity
              onPress={prId ? () => router.push(`/purchase-requests/${prId}` as any) : undefined}
              style={[S.linkRow, { borderBottomColor: C.divider }]}
            >
              <Text style={[S.linkLabel, { color: C.textMuted }]}>Purchase Request</Text>
              <Text style={[S.linkValue, { color: C.primary }]}>{prNumber} →</Text>
            </TouchableOpacity>
          ) : null}
          {createdDate ? <AppCardRow label="Created" value={createdDate} last={!request.notes} /> : null}
          {request.notes ? (
            <View style={[S.notesBox, { backgroundColor: C.surfaceSoft }]}>
              <Text style={[S.notesText, { color: C.textSecondary }]}>{request.notes}</Text>
            </View>
          ) : null}
        </AppCard>

        {/* Suppliers */}
        {request.suppliers && Array.isArray(request.suppliers) && request.suppliers.length > 0 ? (
          <AppCard style={S.card}>
            <Text style={[S.sectionTitle, { color: C.textPrimary }]}>
              Requested Suppliers ({request.suppliers.length})
            </Text>
            {request.suppliers.map((supplier, i) => {
              const s = typeof supplier === 'object' ? supplier as any : { name: String(supplier) };
              const isLast = i === request.suppliers!.length - 1;
              return (
                <View key={i} style={[S.supplierRow,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider }]}>
                  <View style={[S.supplierAvatar, { backgroundColor: C.primarySoft }]}>
                    <IconSymbol name="building.2.fill" size={16} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.supplierName, { color: C.textPrimary }]}>
                      {s.name || s.business_name || 'Unknown'}
                    </Text>
                    {s.email ? <Text style={[S.supplierSub, { color: C.textSecondary }]}>{s.email}</Text> : null}
                    {s.phone ? <Text style={[S.supplierSub, { color: C.textSecondary }]}>{s.phone}</Text> : null}
                  </View>
                </View>
              );
            })}
          </AppCard>
        ) : null}

        {/* View Quotations navigation card */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push(`/purchase-quotations?quotation_request=${id}` as any)}
        >
          <AppCard style={[S.card, { backgroundColor: C.primarySoft }]}>
            <View style={S.nextRow}>
              <View style={[S.nextIcon, { backgroundColor: C.primary }]}>
                <IconSymbol name="dollarsign.circle.fill" size={18} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.sectionTitle, { marginBottom: 2, color: C.primary }]}>View Quotations</Text>
                <Text style={[S.nextSub, { color: C.textSecondary }]}>
                  See supplier price offers for this request
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={C.primary} />
            </View>
          </AppCard>
        </TouchableOpacity>

        <View style={{ height: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.background },
    center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content:      { padding: 16, paddingBottom: 24 },
    card:         { marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14, letterSpacing: -0.2 },

    linkRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
    },
    linkLabel: { fontSize: 13, fontWeight: '500' },
    linkValue: { fontSize: 13, fontWeight: '600' },

    notesBox:  { marginTop: 10, padding: 12, borderRadius: 8 },
    notesText: { fontSize: 13, lineHeight: 20 },

    supplierRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    supplierAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    supplierName:   { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    supplierSub:    { fontSize: 12, marginTop: 1 },

    nextRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
    nextIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    nextSub:  { fontSize: 12 },
  });
}


export default function QuotationRequestDetailScreen() {
  return (
    <AppPermissionGate category="quotation_request" action="view">
      <QuotationRequestDetailScreenInner />
    </AppPermissionGate>
  );
}
