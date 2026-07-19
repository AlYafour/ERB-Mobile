import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { canCreateQuotationRequest, canCreatePurchaseOrder } from '@/lib/utils/workflow-guards';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard, AppCardRow } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppSkeletonList } from '@/components/ui/AppSkeleton';
import RejectionReasonDialog from '@/components/ui/RejectionReasonDialog';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useDetailFetch } from '@/lib/hooks/use-detail-fetch';
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh';
import { baseDetailStyles } from '@/lib/utils/detail-styles';

type AppColors = typeof Colors.light | typeof Colors.dark;

function PurchaseRequestDetailScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const insets = useSafeAreaInsets();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  // Permission-based, matching the web (purchase-requests/[id]/page.tsx).
  // The old role EXCLUSIONS (procurement_officer/site_engineer could never
  // approve even when granted the permission) had no web equivalent — removed.
  const canApprove = hasPermission('purchase_request', 'approve');
  const canReject = hasPermission('purchase_request', 'reject');
  const canUndoApprove = hasPermission('purchase_request', 'undo_approve');
  const canCreateQR = hasPermission('quotation_request', 'create');
  const canCreatePO = hasPermission('purchase_order', 'create');

  const { data: request, loading, refreshing, reload, onRefresh } = useDetailFetch(
    (reqId: number) => purchaseRequestsApi.getById(reqId), id, 'Failed to load'
  );
  const pullToRefresh = usePullToRefresh(refreshing, onRefresh);

  const handleApprove = async () => {
    const prCode = (request as any)?.code || `PR-${id}`;
    const prTitle = (request as any)?.title;
    const label = prTitle ? `${prCode} — ${prTitle}` : prCode;
    if (!await confirm(`Approve ${label}?\n\nThis will mark the request as approved.`)) return;
    try { setApproving(true); await purchaseRequestsApi.approve(id); toast('Approved successfully', 'success'); reload(); }
    catch (e: any) { toast(e.message || 'Failed to approve', 'error'); }
    finally { setApproving(false); }
  };

  const handleRejectConfirm = async (reason: string) => {
    try { setRejecting(true); await purchaseRequestsApi.reject(id, reason); toast('Rejected', 'info'); setRejectOpen(false); reload(); }
    catch (e: any) { toast(e?.response?.data?.error || e.message || 'Failed to reject', 'error'); }
    finally { setRejecting(false); }
  };

  const handleUndoApproval = async () => {
    if (!await confirm('Undo the approval of this request?')) return;
    try { setUndoing(true); await purchaseRequestsApi.undoApproval(id); toast('Approval undone', 'success'); reload(); }
    catch (e: any) { toast(e.message || 'Failed', 'error'); }
    finally { setUndoing(false); }
  };

  const handleResubmit = async () => {
    if (!await confirm('Resubmit this request for approval?')) return;
    try {
      setResubmitting(true);
      await purchaseRequestsApi.resubmit(id);
      toast('Request resubmitted for approval', 'success');
      reload();
    } catch (e: any) {
      toast(e.message || 'Failed to resubmit', 'error');
    } finally {
      setResubmitting(false);
    }
  };

  const handleCreateQR = () => {
    if (!canCreateQR) { toast('You do not have permission to create a Quotation Request', 'error'); return; }
    if ((request as any)?.has_awarded_quotation) { toast('Already has an awarded quotation', 'error'); return; }
    if ((request as any)?.has_purchase_orders) { toast('Already has purchase orders', 'error'); return; }
    const guard = canCreateQuotationRequest(request?.status || '', canCreateQR);
    if (!guard.canProceed) { toast(guard.reason || 'Cannot create QR', 'error'); return; }
    router.push(`/quotation-requests/new?purchase_request_id=${id}` as any);
  };

  const handleCreateLPO = async () => {
    if (!canCreatePO) { toast('You do not have permission to create an LPO', 'error'); return; }
    const guard = canCreatePurchaseOrder(undefined, request?.status);
    if (!guard.canProceed) { toast(guard.reason || 'Cannot create LPO', 'error'); return; }
    if (guard.warning && !await confirm(guard.warning + '\n\nContinue?')) return;
    router.push(`/purchase-orders/new?purchase_request_id=${id}` as any);
  };

  const r = request as any;
  const code = r?.code || `PR-${id}`;

  const S = makeStyles(C);

  const showApproveRejectBar = !loading && !!request && request.status === 'pending' && (canApprove || canReject);
  const showResubmitBar = !loading && !!request && request.status === 'rejected';
  const showBottomBar = showApproveRejectBar || showResubmitBar;

  if (loading && !request) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Purchase Request" showBack />
      <AppSkeletonList count={3} lines={4} />
    </SafeAreaView>
  );

  if (!request) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Purchase Request" showBack />
      <View style={S.center}>
        <AppEmptyState variant="empty" title="Request not found" />
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader
        title={code}
        subtitle={(request.status || 'Unknown').toUpperCase()}
        showBack
      />
      <ScrollView
        contentContainerStyle={[S.content, showBottomBar && { paddingBottom: 32 }]}
        refreshControl={pullToRefresh}
        showsVerticalScrollIndicator={false}>

        {/* Details */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Details</Text>
          <AppCardRow label="Title" value={r.title} />
          <AppCardRow label="Project" value={[typeof request.project === 'object' ? (request.project as any)?.name : '', r.project_code ? `(${r.project_code})` : ''].filter(Boolean).join(' ') || null} />
          <AppCardRow label="Request Date" value={r.request_date ? new Date(r.request_date).toLocaleDateString('en-AE') : null} />
          <AppCardRow label="Required By" value={r.required_by ? new Date(r.required_by).toLocaleDateString('en-AE') : null} />
          <AppCardRow label="Created By" value={r.created_by_name} />
          <AppCardRow label="Approved By" value={r.approved_by_name} last={!r.notes && !r.rejection_reason} />
          {r.notes && (
            <View style={S.notesBox}>
              <Text style={S.notesText}>{r.notes}</Text>
            </View>
          )}
          {r.rejection_reason && (
            <View style={S.rejectionBox}>
              <Text style={S.rejectionLabel}>Rejection Reason</Text>
              <Text style={S.rejectionText}>{r.rejection_reason}</Text>
            </View>
          )}
        </AppCard>

        {/* Items */}
        {request.items && request.items.length > 0 && (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Items ({request.items.length})</Text>
            {request.items.map((item, i) => {
              const it = item as any;
              const name = typeof item.product === 'object' ? (item.product as any)?.name : it.product_name || 'N/A';
              return (
                <View key={item.id || i} style={[S.itemRow, i < request.items!.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                  <View style={S.itemBadge}><Text style={S.itemBadgeText}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.itemName} numberOfLines={2}>{name}</Text>
                    <View style={S.itemMeta}>
                      <Text style={S.itemMetaText}>Qty: {item.quantity || 0} {item.unit || ''}</Text>
                      {it.project_site && <Text style={S.itemMetaText}>Site: {it.project_site}</Text>}
                    </View>
                    {it.reason && <Text style={S.itemNote}>{it.reason}</Text>}
                  </View>
                </View>
              );
            })}
          </AppCard>
        )}

        {/* Next Steps (approved only — pending actions are in the bottom bar) */}
        {request.status === 'approved' && (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Next Steps</Text>

            {canUndoApprove && !r.has_quotation_requests && !r.has_purchase_orders && (
              <AppButton
                title={undoing ? 'Processing...' : 'Undo Approval'}
                variant="outline"
                size="sm"
                onPress={handleUndoApproval}
                disabled={undoing}
                loading={undoing}
                style={{ marginBottom: 10 }}
              />
            )}

            {(canCreateQR || canCreatePO) && !r.has_awarded_quotation && !r.has_purchase_orders && (
              <View style={S.actionRow}>
                {canCreateQR && (
                  <AppButton title="Create QR" variant="primary" size="md" onPress={handleCreateQR} style={{ flex: 1 }} />
                )}
                {canCreatePO && (
                  <AppButton title="Create LPO Direct" variant="secondary" size="md" onPress={handleCreateLPO} style={{ flex: 1 }} />
                )}
              </View>
            )}

            {(r.has_awarded_quotation || r.has_purchase_orders) && (
              <View style={S.infoBox}>
                <IconSymbol name="info.circle.fill" size={20} color={C.primary} />
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
          </AppCard>
        )}

        {/* Tracking */}
        <AppCard style={[S.card, { backgroundColor: C.primarySoft }]} onPress={() => router.push(`/purchase-requests/${id}/tracking` as any)}>
          <View style={S.trackingRow}>
            <View style={[S.trackingIcon, { backgroundColor: C.primary }]}>
              <IconSymbol name="list.bullet" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[S.sectionTitle, { marginBottom: 2 }]}>Workflow Timeline</Text>
              <Text style={{ fontSize: 12, color: C.textSecondary }}>Full procurement tracking: PR → QR → LPO → GRN → Invoice</Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={C.primary} />
          </View>
        </AppCard>

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Fixed bottom action bar */}
      {showBottomBar && (
        <View style={[S.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
          {showResubmitBar && (
            <AppButton
              title="Resubmit for Approval"
              variant="primary"
              size="md"
              onPress={handleResubmit}
              disabled={resubmitting}
              loading={resubmitting}
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
        title="Reject Purchase Request"
        message="Please provide a reason for rejection. This will be visible to the requester."
      />
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    ...baseDetailStyles(C),
    link: { color: C.primary, textDecorationLine: 'underline' },
    notesBox: { marginTop: 10, padding: 12, backgroundColor: C.surfaceSoft, borderRadius: 8 },
    notesText: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
    rejectionBox: { marginTop: 10, padding: 12, backgroundColor: C.dangerBg, borderRadius: 8, borderWidth: 1, borderColor: C.danger },
    rejectionLabel: { fontSize: 11, fontWeight: '700', color: C.danger, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    rejectionText: { fontSize: 13, color: C.danger },
    itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
    itemBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
    itemBadgeText: { fontSize: 11, fontWeight: '700', color: C.primary },
    itemName: { fontSize: 14, fontWeight: '600', color: C.textPrimary, marginBottom: 4 },
    itemMeta: { flexDirection: 'row', gap: 12 },
    itemMetaText: { fontSize: 12, color: C.textSecondary },
    itemNote: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    actionRow: { flexDirection: 'row', gap: 10 },
    infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, backgroundColor: C.surfaceSoft, borderRadius: 10, borderWidth: 1, borderColor: C.border },
    infoTitle: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 4 },
    infoSubtitle: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },
    trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    trackingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    bottomBar: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: C.border,
      backgroundColor: C.surface,
      paddingTop: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      gap: 12,
    },
  });
}


export default function PurchaseRequestDetailScreen() {
  return (
    <AppPermissionGate category="purchase_request" action="view">
      <PurchaseRequestDetailScreenInner />
    </AppPermissionGate>
  );
}
