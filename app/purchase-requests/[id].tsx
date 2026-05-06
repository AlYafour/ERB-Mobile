import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { canCreateQuotationRequest, canCreatePurchaseOrder } from '@/lib/utils/workflow-guards';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import RejectionReasonDialog from '@/components/ui/RejectionReasonDialog';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { PurchaseRequest } from '@/types';

const C = Colors.light;

const statusVariant = (s?: string): 'success' | 'error' | 'warning' | 'info' =>
  s === 'approved' ? 'success' : s === 'rejected' ? 'error' : s === 'pending' ? 'warning' : 'info';

function DetailRow({ label, value, link, onPress }: { label: string; value?: string | null; link?: boolean; onPress?: () => void }) {
  if (!value) return null;
  return (
    <View style={S.row}>
      <Text style={S.rowLabel}>{label}</Text>
      {onPress ? (
        <TouchableOpacity onPress={onPress}><Text style={[S.rowValue, S.link]}>{value}</Text></TouchableOpacity>
      ) : (
        <Text style={S.rowValue}>{value}</Text>
      )}
    </View>
  );
}

export default function PurchaseRequestDetailScreen() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const su = user?.is_superuser ?? false;
  const canApprove = su || ((hasPermission('purchase_request', 'approve') ?? false) && user?.role !== 'procurement_officer' && user?.role !== 'site_engineer');
  const canReject = su || ((hasPermission('purchase_request', 'reject') ?? false) && user?.role !== 'procurement_officer' && user?.role !== 'site_engineer');
  const canCreateQR = hasPermission('quotation_request', 'create') ?? false;
  const canCreatePO = hasPermission('purchase_order', 'create') ?? false;
  const isProcurement = user?.role === 'procurement_officer' || user?.role === 'super_admin' || su;

  const load = async () => {
    try {
      setLoading(true);
      setRequest(await purchaseRequestsApi.getById(id));
    } catch (e: any) { toast(e.message || 'Failed to load', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleApprove = async () => {
    if (!await confirm('Approve this purchase request?')) return;
    try { setApproving(true); await purchaseRequestsApi.approve(id); toast('Approved successfully', 'success'); load(); }
    catch (e: any) { toast(e.message || 'Failed to approve', 'error'); }
    finally { setApproving(false); }
  };

  const handleRejectConfirm = async (reason: string) => {
    try { setRejecting(true); await purchaseRequestsApi.reject(id, reason); toast('Rejected', 'info'); setRejectOpen(false); load(); }
    catch (e: any) { toast(e?.response?.data?.error || e.message || 'Failed to reject', 'error'); }
    finally { setRejecting(false); }
  };

  const handleUndoApproval = async () => {
    if (!await confirm('Undo the approval of this request?')) return;
    try { setUndoing(true); await purchaseRequestsApi.undoApproval(id); toast('Approval undone', 'success'); load(); }
    catch (e: any) { toast(e.message || 'Failed', 'error'); }
    finally { setUndoing(false); }
  };

  const handleCreateQR = () => {
    if (!isProcurement) { toast('Only Procurement Officer can create Quotation Request', 'error'); return; }
    if ((request as any)?.has_awarded_quotation) { toast('Already has an awarded quotation', 'error'); return; }
    if ((request as any)?.has_purchase_orders) { toast('Already has purchase orders', 'error'); return; }
    const guard = canCreateQuotationRequest(request?.status || '', canCreateQR);
    if (!guard.canProceed) { toast(guard.reason || 'Cannot create QR', 'error'); return; }
    router.push(`/quotation-requests/new?purchase_request_id=${id}` as any);
  };

  const handleCreateLPO = async () => {
    if (!isProcurement) { toast('Only Procurement Officer can create LPO', 'error'); return; }
    const guard = canCreatePurchaseOrder(undefined, request?.status);
    if (!guard.canProceed) { toast(guard.reason || 'Cannot create LPO', 'error'); return; }
    if (guard.warning && !await confirm(guard.warning + '\n\nContinue?')) return;
    router.push(`/purchase-orders/new?purchase_request_id=${id}` as any);
  };

  const r = request as any;
  const code = r?.code || `PR-${id}`;

  if (loading) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Purchase Request" showBack />
      <View style={S.center}><ActivityIndicator size="large" color={C.tint} /></View>
    </SafeAreaView>
  );

  if (!request) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Purchase Request" showBack />
      <View style={S.center}><Text style={S.errorText}>Request not found</Text></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader
        title={code}
        subtitle={(request.status || '').toUpperCase()}
        showBack
        rightElement={<Badge variant={statusVariant(request.status)}>{r?.status || 'Unknown'}</Badge>}
      />
      <ScrollView
        contentContainerStyle={S.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.tint} colors={[C.tint]} />}
        showsVerticalScrollIndicator={false}>

        {/* Details */}
        <Card padding={16} style={S.card}>
          <Text style={S.sectionTitle}>Details</Text>
          <DetailRow label="Title" value={r.title} />
          <DetailRow label="Project" value={[typeof request.project === 'object' ? (request.project as any)?.name : '', r.project_code ? `(${r.project_code})` : ''].filter(Boolean).join(' ')} />
          <DetailRow label="Request Date" value={r.request_date ? new Date(r.request_date).toLocaleDateString('en-AE') : null} />
          <DetailRow label="Required By" value={r.required_by ? new Date(r.required_by).toLocaleDateString('en-AE') : null} />
          <DetailRow label="Created By" value={r.created_by_name} />
          <DetailRow label="Approved By" value={r.approved_by_name} />
          {r.notes && <View style={S.notesBox}><Text style={S.notesText}>{r.notes}</Text></View>}
          {r.rejection_reason && (
            <View style={S.rejectionBox}>
              <Text style={S.rejectionLabel}>Rejection Reason</Text>
              <Text style={S.rejectionText}>{r.rejection_reason}</Text>
            </View>
          )}
        </Card>

        {/* Items */}
        {request.items && request.items.length > 0 && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Items ({request.items.length})</Text>
            {request.items.map((item, i) => {
              const it = item as any;
              const name = typeof item.product === 'object' ? (item.product as any)?.name : it.product_name || 'N/A';
              return (
                <View key={item.id || i} style={[S.itemRow, i < request.items!.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.borderLight }]}>
                  <View style={S.itemBadge}><Text style={S.itemBadgeText}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.itemName}>{name}</Text>
                    <View style={S.itemMeta}>
                      <Text style={S.itemMetaText}>Qty: {item.quantity || 0} {item.unit || ''}</Text>
                      {it.project_site && <Text style={S.itemMetaText}>Site: {it.project_site}</Text>}
                    </View>
                    {it.reason && <Text style={S.itemNote}>{it.reason}</Text>}
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Workflow Actions */}
        {request.status === 'pending' && (canApprove || canReject) && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Actions</Text>
            <View style={S.actionRow}>
              {canApprove && <Button title={approving ? 'Processing...' : 'Approve'} variant="primary" onPress={handleApprove} disabled={approving} loading={approving} style={{ flex: 1 }} />}
              {canReject && <Button title="Reject" variant="danger" onPress={() => setRejectOpen(true)} style={{ flex: 1 }} />}
            </View>
          </Card>
        )}

        {request.status === 'approved' && (
          <Card padding={16} style={S.card}>
            <Text style={S.sectionTitle}>Next Steps</Text>

            {/* Undo approval */}
            {(canApprove || su) && !r.has_quotation_requests && !r.has_purchase_orders && (
              <Button title={undoing ? 'Processing...' : 'Undo Approval'} variant="secondary" onPress={handleUndoApproval} disabled={undoing} style={{ marginBottom: 10 }} />
            )}

            {/* Procurement workflow buttons */}
            {isProcurement && !r.has_awarded_quotation && !r.has_purchase_orders && (
              <View style={S.actionRow}>
                <Button title="Create QR" variant="primary" onPress={handleCreateQR} style={{ flex: 1 }} />
                <Button title="Create LPO Direct" variant="secondary" onPress={handleCreateLPO} style={{ flex: 1 }} />
              </View>
            )}

            {/* Info when locked */}
            {(r.has_awarded_quotation || r.has_purchase_orders) && (
              <View style={S.infoBox}>
                <IconSymbol name="info.circle.fill" size={20} color={C.tint} />
                <View style={{ flex: 1 }}>
                  <Text style={S.infoTitle}>{r.has_purchase_orders ? 'LPO Created' : 'Supplier Awarded'}</Text>
                  <Text style={S.infoSubtitle}>
                    {r.has_purchase_orders
                      ? 'This PR has an active Purchase Order. View it in the LPO section.'
                      : 'A supplier has been awarded. Proceed to create an LPO if needed.'}
                  </Text>
                  {r.has_purchase_orders && (
                    <TouchableOpacity onPress={() => router.push(`/purchase-orders?purchase_request=${id}` as any)}>
                      <Text style={S.link}>View Purchase Orders →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Tracking */}
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/purchase-requests/${id}/tracking` as any)}>
          <Card padding={16} style={[S.card, { backgroundColor: C.tintSubtle }]}>
            <View style={S.trackingRow}>
              <View style={[S.trackingIcon, { backgroundColor: C.tint }]}>
                <IconSymbol name="list.bullet" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.sectionTitle, { marginBottom: 2 }]}>Workflow Timeline</Text>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>Full procurement tracking: PR → QR → LPO → GRN → Invoice</Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={C.tint} />
            </View>
          </Card>
        </TouchableOpacity>

        <View style={{ height: 8 }} />
      </ScrollView>

      <RejectionReasonDialog
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleRejectConfirm}
        title="Reject Purchase Request"
        message="Please provide a reason for rejection. This will be visible to the requester."
      />
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
  rejectionBox: { marginTop: 10, padding: 12, backgroundColor: C.errorLight, borderRadius: 8, borderWidth: 1, borderColor: C.error },
  rejectionLabel: { fontSize: 11, fontWeight: '700', color: C.error, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  rejectionText: { fontSize: 13, color: C.error },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  itemBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.tintSubtle, alignItems: 'center', justifyContent: 'center' },
  itemBadgeText: { fontSize: 11, fontWeight: '700', color: C.tint },
  itemName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 4 },
  itemMeta: { flexDirection: 'row', gap: 12 },
  itemMetaText: { fontSize: 12, color: C.textSecondary },
  itemNote: { fontSize: 12, color: C.textTertiary, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, backgroundColor: C.backgroundSecondary, borderRadius: 10, borderWidth: 1, borderColor: C.borderLight },
  infoTitle: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4 },
  infoSubtitle: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trackingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
