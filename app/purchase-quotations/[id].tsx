import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseQuotationsApi } from '@/lib/api/purchase-quotations';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard, AppCardRow } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PurchaseQuotation } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';

type AppColors = typeof Colors.light | typeof Colors.dark;

function getStatusVariant(s?: string): 'success' | 'danger' | 'warning' | 'info' | 'default' {
  switch (s) {
    case 'accepted':
    case 'awarded':  return 'success';
    case 'rejected':
    case 'cancelled':
    case 'expired':  return 'danger';
    case 'pending':  return 'warning';
    default:         return 'default';
  }
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-AE', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PurchaseQuotationDetailScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const S = makeStyles(C);

  const [quotation, setQuotation] = useState<PurchaseQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Permission-based, matching the web (purchase-quotations/[id]/page.tsx):
  // award/reject come from the permission system, not a hardcoded role.
  const { hasPermission } = usePermissions();
  const canAward = hasPermission('purchase_quotation', 'award');
  const canReject = hasPermission('purchase_quotation', 'reject');

  const load = async () => {
    try { setLoading(true); setQuotation(await purchaseQuotationsApi.getById(id)); }
    catch (e: any) { toast(e.message || 'Failed to load', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleAward = async () => {
    if (!await confirm('Award this quotation? This marks it as the selected supplier.')) return;
    try {
      setAwarding(true);
      await purchaseQuotationsApi.award(id);
      toast('Quotation awarded', 'success');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to award', 'error');
    } finally {
      setAwarding(false);
    }
  };

  const handleReject = async () => {
    if (!await confirm('Reject this quotation?')) return;
    try {
      setRejecting(true);
      await purchaseQuotationsApi.reject(id);
      toast('Quotation rejected', 'info');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to reject', 'error');
    } finally {
      setRejecting(false);
    }
  };

  if (loading && !quotation) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Purchase Quotation" showBack />
      <View style={S.center}><AppEmptyState variant="loading" title="Loading quotation..." /></View>
    </SafeAreaView>
  );

  if (!quotation) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Purchase Quotation" showBack />
      <View style={S.center}><AppEmptyState variant="empty" title="Quotation not found" /></View>
    </SafeAreaView>
  );

  const q = quotation as any;
  const supplierName = typeof quotation.supplier === 'object' ? (quotation.supplier as any)?.name : null;
  const pqNum = quotation.quotation_number || `PQ-${id}`;
  const statusLabel = quotation.status
    ? quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)
    : 'Pending';

  const showActions = quotation.status === 'pending' && (canAward || canReject);

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader
        title={pqNum}
        showBack
        right={<AppBadge variant={getStatusVariant(quotation.status)}>{statusLabel}</AppBadge>}
      />
      <ScrollView
        contentContainerStyle={[S.content, { paddingBottom: showActions ? 100 : 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.primary} colors={[C.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quotation Info */}
        <AppCard style={S.card}>
          <Text style={[S.sectionTitle, { color: C.textPrimary }]}>Quotation Information</Text>
          {supplierName ? <AppCardRow label="Supplier" value={supplierName} /> : null}
          {quotation.quotation_date ? (
            <AppCardRow label="Quotation Date" value={fmtDate(quotation.quotation_date)} />
          ) : null}
          {quotation.valid_until ? (
            <AppCardRow label="Valid Until" value={fmtDate(quotation.valid_until)} />
          ) : null}
          {quotation.payment_terms ? (
            <AppCardRow label="Payment Terms" value={quotation.payment_terms} />
          ) : null}
          {quotation.delivery_terms ? (
            <AppCardRow label="Delivery Terms" value={quotation.delivery_terms} last={!quotation.notes} />
          ) : null}
          {quotation.notes ? (
            <View style={[S.notesBox, { backgroundColor: C.surfaceSoft }]}>
              <Text style={[S.notesText, { color: C.textSecondary }]}>{quotation.notes}</Text>
            </View>
          ) : null}
        </AppCard>

        {/* Items */}
        {quotation.items && quotation.items.length > 0 ? (
          <AppCard style={S.card}>
            <Text style={[S.sectionTitle, { color: C.textPrimary }]}>Items ({quotation.items.length})</Text>
            {quotation.items.map((item, i) => {
              const it = item as any;
              const name = typeof item.product === 'object'
                ? (item.product as any)?.name : it.product_name || 'N/A';
              const isLast = i === quotation.items!.length - 1;
              return (
                <View key={item.id || i} style={[S.itemRow,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.itemName, { color: C.textPrimary }]}>{name}</Text>
                    <View style={S.metaChips}>
                      <View style={[S.chip, { backgroundColor: C.surfaceSoft }]}>
                        <Text style={[S.chipText, { color: C.textMuted }]}>
                          Qty: {item.quantity} {it.unit || ''}
                        </Text>
                      </View>
                      {item.unit_price ? (
                        <View style={[S.chip, { backgroundColor: C.surfaceSoft }]}>
                          <Text style={[S.chipText, { color: C.textMuted }]}>
                            AED {Number(item.unit_price).toFixed(2)}
                          </Text>
                        </View>
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
        ) : null}

        {/* Summary */}
        {quotation.total_amount !== undefined ? (
          <AppCard style={S.card}>
            <Text style={[S.sectionTitle, { color: C.textPrimary }]}>Summary</Text>
            {quotation.subtotal !== undefined ? (
              <AppCardRow label="Subtotal" value={`AED ${Number(quotation.subtotal).toFixed(2)}`} />
            ) : null}
            {q.tax_amount !== undefined && q.tax_amount > 0 ? (
              <AppCardRow label="Tax" value={`AED ${Number(q.tax_amount).toFixed(2)}`} />
            ) : null}
            <View style={[S.totalRow, { borderTopColor: C.primary }]}>
              <Text style={[S.totalLabel, { color: C.textPrimary }]}>Total</Text>
              <Text style={[S.totalValue, { color: C.primary }]}>
                AED {Number(quotation.total_amount).toFixed(2)}
              </Text>
            </View>
          </AppCard>
        ) : null}

        {/* Next step: Create LPO (when awarded) */}
        {quotation.status === 'awarded' ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/purchase-orders/new?purchase_quotation_id=${id}` as any)}
          >
            <AppCard style={[S.card, { backgroundColor: C.successBg }]}>
              <View style={S.nextRow}>
                <View style={[S.nextIcon, { backgroundColor: C.success }]}>
                  <IconSymbol name="doc.text.fill" size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.sectionTitle, { marginBottom: 2, color: C.success }]}>
                    Next Step: Create LPO
                  </Text>
                  <Text style={[S.nextSub, { color: C.textSecondary }]}>
                    Issue a Local Purchase Order for this awarded supplier
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={18} color={C.success} />
              </View>
            </AppCard>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Fixed bottom action bar */}
      {showActions ? (
        <View style={[S.bottomBar, { borderTopColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {canAward ? (
            <AppButton title="Award Quotation" variant="primary" size="md"
              onPress={handleAward} loading={awarding} disabled={awarding || rejecting}
              style={S.barBtn} />
          ) : null}
          {canReject ? (
            <AppButton title="Reject" variant="dangerOutline" size="md"
              onPress={handleReject} loading={rejecting} disabled={awarding || rejecting}
              style={S.barBtn} />
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.background },
    center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content:      { padding: 16 },
    card:         { marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14, letterSpacing: -0.2 },

    notesBox:  { marginTop: 10, padding: 12, borderRadius: 8 },
    notesText: { fontSize: 13, lineHeight: 20 },

    itemRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
    itemName:  { fontSize: 14, fontWeight: '600', marginBottom: 4 },
    metaChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip:      { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    chipText:  { fontSize: 12 },
    itemTotal: { fontSize: 14, fontWeight: '700' },

    totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, marginTop: 4, borderTopWidth: 2 },
    totalLabel: { fontSize: 15, fontWeight: '700' },
    totalValue: { fontSize: 16, fontWeight: '800' },

    nextRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
    nextIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    nextSub:  { fontSize: 12 },

    bottomBar: {
      flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: C.surface,
    },
    barBtn: { flex: 1 },
  });
}


export default function PurchaseQuotationDetailScreen() {
  return (
    <AppPermissionGate category="purchase_quotation" action="view">
      <PurchaseQuotationDetailScreenInner />
    </AppPermissionGate>
  );
}
