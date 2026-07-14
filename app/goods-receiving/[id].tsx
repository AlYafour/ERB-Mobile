import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goodsReceivingApi, GoodsReceivedNote } from '@/lib/api/goods-receiving';
import { useAuth } from '@/contexts/AuthContext';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard, AppCardRow } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AppColors = typeof Colors.light | typeof Colors.dark;

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  partial: 'Partial',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function getStatusVariant(s?: string): 'success' | 'danger' | 'warning' | 'info' | 'default' {
  switch (s) {
    case 'completed': return 'success';
    case 'cancelled': return 'danger';
    case 'partial':   return 'warning';
    case 'draft':     return 'default';
    default:          return 'info';
  }
}

function getQualityVariant(s?: string): 'success' | 'danger' | 'warning' | 'info' {
  switch (s) {
    case 'good':     return 'success';
    case 'defective': case 'missing': return 'danger';
    case 'damaged':  return 'warning';
    default:         return 'info';
  }
}

export default function GoodsReceivingDetailScreen() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const insets = useSafeAreaInsets();

  const [grn, setGrn] = useState<GoodsReceivedNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const su = user?.is_superuser ?? false;
  const isProcurement = user?.role === 'procurement_officer' || user?.role === 'super_admin' || su;

  const load = async () => {
    try {
      setLoading(true);
      setGrn(await goodsReceivingApi.getById(id));
    } catch (e: any) {
      toast(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleMarkDelivered = async () => {
    if (!await confirm('Mark supplier invoice as delivered?')) return;
    try {
      setMarkingDelivered(true);
      await goodsReceivingApi.markInvoiceDelivered(id);
      toast('Invoice marked as delivered', 'success');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to mark delivered', 'error');
    } finally {
      setMarkingDelivered(false);
    }
  };

  const handleCancel = async () => {
    if (!await confirm('Cancel this GRN?\n\nThis action cannot be undone.')) return;
    try {
      setCancelling(true);
      await goodsReceivingApi.cancel(id);
      toast('GRN cancelled', 'info');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to cancel', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const S = makeStyles(C);

  const showMarkDeliveredBtn = !loading && !!grn && grn.invoice_delivery_status === 'not_delivered' && grn.status !== 'cancelled';
  const showCancelBtn = !loading && !!grn && grn.status !== 'cancelled' && isProcurement;
  const showBottomBar = showMarkDeliveredBtn || showCancelBtn;

  if (loading && !grn) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Goods Receiving" showBack />
      <View style={S.center}>
        <AppEmptyState variant="loading" title="Loading GRN..." />
      </View>
    </SafeAreaView>
  );

  if (!grn) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Goods Receiving" showBack />
      <View style={S.center}>
        <AppEmptyState variant="empty" title="GRN not found" />
      </View>
    </SafeAreaView>
  );

  const poObj  = typeof grn.purchase_order === 'object' ? grn.purchase_order as any : null;
  const poId   = poObj?.id ?? grn.purchase_order_id;
  const poNum  = poObj?.order_number ?? (grn.purchase_order ? `PO-${grn.purchase_order}` : null);
  const grnNum = grn.grn_number || `GRN-${id}`;
  const receiptDate = grn.receipt_date
    ? new Date(grn.receipt_date).toLocaleDateString('en-AE', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader
        title={grnNum}
        subtitle={(statusLabels[grn.status] || grn.status || 'Draft').toUpperCase()}
        showBack
        right={
          <AppBadge variant={getStatusVariant(grn.status)}>
            {statusLabels[grn.status] || grn.status || 'Draft'}
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
        {/* GRN Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>GRN Information</Text>
          {poNum ? (
            <TouchableOpacity
              onPress={poId ? () => router.push(`/purchase-orders/${poId}` as any) : undefined}
              style={[S.linkRow, { borderBottomColor: C.divider }]}
            >
              <Text style={[S.linkLabel, { color: C.textMuted }]}>Purchase Order</Text>
              <Text style={[S.linkValue, { color: C.primary }]}>{poNum} →</Text>
            </TouchableOpacity>
          ) : null}
          <AppCardRow label="Receipt Date"  value={receiptDate} />
          <AppCardRow label="Received By"   value={grn.received_by_name} />
          {grn.total_items !== undefined && grn.total_items > 0 && (
            <AppCardRow label="Total Items"  value={String(grn.total_items)} />
          )}
          {grn.total_received_quantity !== undefined && grn.total_received_quantity > 0 && (
            <AppCardRow label="Total Qty Received" value={String(grn.total_received_quantity)} />
          )}
          {grn.notes ? (
            <View style={[S.notesBox, { backgroundColor: C.surfaceSoft }]}>
              <Text style={[S.notesText, { color: C.textSecondary }]}>{grn.notes}</Text>
            </View>
          ) : null}
        </AppCard>

        {/* Invoice Delivery Status */}
        {grn.invoice_delivery_status ? (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Invoice Delivery</Text>
            <View style={S.invoiceRow}>
              <Text style={[S.invoiceLabel, { color: C.textMuted }]}>Status</Text>
              <AppBadge variant={grn.invoice_delivery_status === 'delivered' ? 'success' : 'warning'}>
                {grn.invoice_delivery_status === 'delivered' ? 'Delivered' : 'Not Delivered'}
              </AppBadge>
            </View>
          </AppCard>
        ) : null}

        {/* Received Items */}
        {grn.items && grn.items.length > 0 && (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Received Items ({grn.items.length})</Text>
            {grn.items.map((item, i) => {
              const name = typeof item.product === 'object' ? (item.product as any)?.name : 'N/A';
              const isLast = i === grn.items.length - 1;
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

                    {/* Qty boxes */}
                    <View style={S.qtyRow}>
                      <View style={[S.qtyBox, { backgroundColor: C.surfaceSoft }]}>
                        <Text style={[S.qtyLabel, { color: C.textMuted }]}>Ordered</Text>
                        <Text style={[S.qtyValue, { color: C.textPrimary }]}>{item.ordered_quantity}</Text>
                      </View>
                      <View style={[S.qtyBox, { backgroundColor: C.successBg }]}>
                        <Text style={[S.qtyLabel, { color: C.success }]}>Received</Text>
                        <Text style={[S.qtyValue, { color: C.success }]}>{item.received_quantity}</Text>
                      </View>
                      {item.rejected_quantity > 0 ? (
                        <View style={[S.qtyBox, { backgroundColor: C.dangerBg }]}>
                          <Text style={[S.qtyLabel, { color: C.danger }]}>Rejected</Text>
                          <Text style={[S.qtyValue, { color: C.danger }]}>{item.rejected_quantity}</Text>
                        </View>
                      ) : null}
                    </View>

                    {item.quality_status ? (
                      <View style={S.qualityRow}>
                        <AppBadge variant={getQualityVariant(item.quality_status)}>
                          {item.quality_status.toUpperCase()}
                        </AppBadge>
                      </View>
                    ) : null}
                    {item.notes ? (
                      <Text style={[S.itemNote, { color: C.textMuted }]}>{item.notes}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </AppCard>
        )}

        {/* Next Step: Create Invoice */}
        {(grn.status === 'completed' || grn.status === 'partial') ? (
          <AppCard
            style={[S.card, { backgroundColor: C.primarySoft }]}
            onPress={() => router.push(`/purchase-invoices/new?goods_receiving_id=${id}&purchase_order_id=${poId}` as any)}
          >
            <View style={S.nextRow}>
              <View style={[S.nextIcon, { backgroundColor: C.primary }]}>
                <IconSymbol name="doc.fill" size={18} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.sectionTitle, { marginBottom: 2 }]}>Next Step: Create Invoice</Text>
                <Text style={[S.nextSubtitle, { color: C.textSecondary }]}>
                  Create a purchase invoice for these received goods
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={C.primary} />
            </View>
          </AppCard>
        ) : null}

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Fixed bottom bar */}
      {showBottomBar && (
        <View style={[S.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: C.border, backgroundColor: C.surface }]}>
          {showMarkDeliveredBtn && (
            <AppButton
              title="Mark Invoice Delivered"
              variant="primary"
              size="md"
              onPress={handleMarkDelivered}
              disabled={markingDelivered || cancelling}
              loading={markingDelivered}
              style={{ flex: 1 }}
            />
          )}
          {showCancelBtn && (
            <AppButton
              title="Cancel GRN"
              variant="dangerOutline"
              size="md"
              onPress={handleCancel}
              disabled={cancelling || markingDelivered}
              loading={cancelling}
              style={{ flex: showMarkDeliveredBtn ? undefined : 1 }}
            />
          )}
        </View>
      )}
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
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    linkLabel: { fontSize: 13, fontWeight: '400', flex: 1 },
    linkValue: { fontSize: 13, fontWeight: '600', flex: 1.2, textAlign: 'right' },

    notesBox: { marginTop: 10, padding: 12, borderRadius: 8 },
    notesText: { fontSize: 13, lineHeight: 20 },

    invoiceRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingVertical: 4,
    },
    invoiceLabel: { fontSize: 13, fontWeight: '500' },

    itemRow: {
      flexDirection: 'row', alignItems: 'flex-start',
      gap: 10, paddingVertical: 14,
    },
    itemBadge: {
      width: 24, height: 24, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', marginTop: 2,
    },
    itemBadgeText: { fontSize: 11, fontWeight: '700' },
    itemName: { fontSize: 14, fontWeight: '600', marginBottom: 10 },

    qtyRow: { flexDirection: 'row', gap: 8 },
    qtyBox: {
      flex: 1, borderRadius: 8, padding: 8,
      alignItems: 'center',
    },
    qtyLabel: {
      fontSize: 10, fontWeight: '600',
      textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2,
    },
    qtyValue: { fontSize: 16, fontWeight: '700' },

    qualityRow: { marginTop: 8, flexDirection: 'row' },
    itemNote: { fontSize: 12, marginTop: 6, lineHeight: 17 },

    nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    nextIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    nextSubtitle: { fontSize: 12 },

    bottomBar: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: 12, paddingHorizontal: 16,
    },
  });
}
