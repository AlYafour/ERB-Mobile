import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { canCreateQuotationRequest, canCreatePurchaseOrder } from '@/lib/utils/workflow-guards';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import RejectionReasonDialog from '@/components/ui/RejectionReasonDialog';
import { PurchaseRequest } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { CommonStyles } from '@/constants/common-styles';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function PurchaseRequestDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [undoingApproval, setUndoingApproval] = useState(false);

  const isSuperuser = user?.is_superuser ?? false;
  const canApprove =
    isSuperuser ||
    ((hasPermission('purchase_request', 'approve') ?? false) &&
      user?.role !== 'procurement_officer' &&
      user?.role !== 'site_engineer');
  const canReject =
    isSuperuser ||
    ((hasPermission('purchase_request', 'reject') ?? false) &&
      user?.role !== 'procurement_officer' &&
      user?.role !== 'site_engineer');
  const canCreateQR = hasPermission('quotation_request', 'create') ?? false;
  const canCreatePO = hasPermission('purchase_order', 'create') ?? false;

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const data = await purchaseRequestsApi.getById(id);
      setRequest(data);
    } catch (error: any) {
      console.error('Error loading purchase request:', error);
      toast(error.message || 'Failed to load purchase request', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRequest();
  };

  const handleApprove = async () => {
    const confirmed = await confirm('Are you sure you want to approve this request?');
    if (!confirmed) return;

    try {
      setApproving(true);
      await purchaseRequestsApi.approve(id);
      toast('Request approved successfully', 'success');
      loadRequest();
    } catch (error: any) {
      toast(error.message || 'Failed to approve request', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = () => {
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    try {
      setRejecting(true);
      await purchaseRequestsApi.reject(id, reason);
      toast('Request rejected', 'info');
      setRejectDialogOpen(false);
      loadRequest();
    } catch (error: any) {
      const message = error?.response?.data?.error || error.message || 'Failed to reject request';
      toast(message, 'error');
    } finally {
      setRejecting(false);
    }
  };

  const handleUndoApproval = async () => {
    const confirmed = await confirm('Are you sure you want to undo the approval?');
    if (!confirmed) return;

    try {
      setUndoingApproval(true);
      await purchaseRequestsApi.undoApproval(id);
      toast('Approval undone successfully', 'success');
      loadRequest();
    } catch (error: any) {
      toast(error.message || 'Failed to undo approval', 'error');
    } finally {
      setUndoingApproval(false);
    }
  };

  const handleCreateQuotationRequest = () => {
    if (user?.role !== 'procurement_officer' && user?.role !== 'super_admin' && !user?.is_superuser) {
      toast('Only Procurement Officer can create Quotation Request', 'error');
      return;
    }
    if ((request as any)?.has_awarded_quotation) {
      toast('Cannot create quotation request. This Purchase Request already has an awarded quotation.', 'error');
      return;
    }
    if ((request as any)?.has_purchase_orders) {
      toast('Cannot create quotation request. This Purchase Request already has purchase orders.', 'error');
      return;
    }
    const guard = canCreateQuotationRequest(request?.status || '', canCreateQR);
    if (!guard.canProceed) {
      toast(guard.reason || 'Cannot create quotation request', 'error');
      return;
    }
    router.push(`/quotation-requests/new?purchase_request_id=${id}` as any);
  };

  const handleCreatePurchaseOrder = async () => {
    if (user?.role !== 'procurement_officer' && user?.role !== 'super_admin' && !user?.is_superuser) {
      toast('Only Procurement Officer can create Purchase Order', 'error');
      return;
    }
    const guard = canCreatePurchaseOrder(undefined, request?.status);
    if (!guard.canProceed) {
      toast(guard.reason || 'Cannot create purchase order', 'error');
      return;
    }
    if (guard.warning) {
      const shouldContinue = await confirm(guard.warning + '\n\nDo you want to continue?');
      if (!shouldContinue) {
        return;
      }
    }
    router.push(`/purchase-orders/new?purchase_request_id=${id}` as any);
  };

  const getStatusVariant = (status?: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Card style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </Card>
      </ThemedView>
    );
  }

  if (!request) {
    return (
      <ThemedView style={styles.container}>
        <Card style={styles.emptyCard}>
          <ThemedText style={styles.emptyText}>Request not found</ThemedText>
        </Card>
      </ThemedView>
    );
  }

  const projectName =
    typeof request.project === 'object'
      ? request.project?.name
      : (request as any).project_code || '—';
  const projectCode =
    typeof request.project === 'object' ? (request.project as any)?.code : (request as any).project_code || '';

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={Colors.light.tint} />
            <ThemedText style={styles.backText}>Back</ThemedText>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <ThemedText type="title" style={styles.headerTitle}>
              {(request as any).code || `PR-${String(request.id).slice(0, 8)}`}
            </ThemedText>
            <Badge variant={getStatusVariant(request.status)}>
              {statusLabels[request.status || ''] || request.status || 'Unknown'}
            </Badge>
          </View>
        </View>

        {/* Details Card */}
        <Card style={styles.detailsCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Details
          </ThemedText>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>Title</ThemedText>
              <ThemedText style={styles.detailValue}>{(request as any).title || '—'}</ThemedText>
            </View>
            <View style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>Project</ThemedText>
              <ThemedText style={styles.detailValue}>
                {projectName} {projectCode && `(${projectCode})`}
              </ThemedText>
            </View>
            <View style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>Request Date</ThemedText>
              <ThemedText style={styles.detailValue}>
                {(request as any).request_date
                  ? new Date((request as any).request_date).toLocaleDateString('en-US')
                  : '—'}
              </ThemedText>
            </View>
            <View style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>Required By</ThemedText>
              <ThemedText style={styles.detailValue}>
                {(request as any).required_by
                  ? new Date((request as any).required_by).toLocaleDateString('en-US')
                  : '—'}
              </ThemedText>
            </View>
            <View style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>Created By</ThemedText>
              <ThemedText style={styles.detailValue}>
                {(request as any).created_by_name || '—'}
              </ThemedText>
            </View>
            {(request as any).approved_by_name && (
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Approved By</ThemedText>
                <ThemedText style={styles.detailValue}>{(request as any).approved_by_name}</ThemedText>
              </View>
            )}
            {(request as any).notes && (
              <View style={[styles.detailItem, styles.fullWidth]}>
                <ThemedText style={styles.detailLabel}>Notes</ThemedText>
                <ThemedText style={styles.detailValue}>{(request as any).notes}</ThemedText>
              </View>
            )}
            {(request as any).rejection_reason && (
              <View style={[styles.detailItem, styles.fullWidth]}>
                <ThemedText style={styles.detailLabel}>Rejection Reason</ThemedText>
                <View style={styles.rejectionBox}>
                  <ThemedText style={styles.rejectionText}>
                    {(request as any).rejection_reason}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>
        </Card>

        {/* Items Section */}
        {request.items && request.items.length > 0 && (
          <Card style={styles.itemsCard}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Required Products ({request.items.length})
            </ThemedText>
            {request.items.map((item, index) => (
              <View key={item.id || index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <ThemedText type="defaultSemiBold" style={styles.itemName}>
                    {typeof item.product === 'object'
                      ? item.product?.name
                      : (item as any).product_name || 'N/A'}
                  </ThemedText>
                  {typeof item.product === 'object' && (item.product as any)?.code && (
                    <ThemedText style={styles.itemCode}>
                      Code: {(item.product as any).code}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.itemDetails}>
                  <ThemedText style={styles.itemDetail}>
                    Qty: {item.quantity || 0} {item.unit || (typeof item.product === 'object' ? (item.product as any)?.unit : '') || 'units'}
                  </ThemedText>
                  {(item as any).project_site && (
                    <ThemedText style={styles.itemDetail}>
                      Site: {(item as any).project_site}
                    </ThemedText>
                  )}
                  {(item as any).reason && (
                    <ThemedText style={styles.itemDetail}>Reason: {(item as any).reason}</ThemedText>
                  )}
                  {(item as any).notes && (
                    <ThemedText style={styles.itemDetail}>Notes: {(item as any).notes}</ThemedText>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Actions */}
        {request.status === 'pending' && (canApprove || canReject) && (
          <Card style={styles.actionsCard}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Actions
            </ThemedText>
            <View style={styles.actionsRow}>
              {canApprove && (
                <Button
                  title={approving ? 'Processing...' : 'Approve'}
                  variant="primary"
                  onPress={handleApprove}
                  disabled={approving}
                  loading={approving}
                  style={styles.actionButton}
                />
              )}
              {canReject && (
                <Button
                  title={rejecting ? 'Processing...' : 'Reject'}
                  variant="danger"
                  onPress={handleReject}
                  disabled={rejecting}
                  loading={rejecting}
                  style={styles.actionButton}
                />
              )}
            </View>
          </Card>
        )}

        {request.status === 'approved' && (
          <Card style={styles.actionsCard}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Actions
            </ThemedText>
            {(canApprove || user?.role === 'super_admin' || user?.is_superuser) &&
              !(request as any).has_quotation_requests &&
              !(request as any).has_purchase_orders && (
                <Button
                  title={undoingApproval ? 'Processing...' : 'Undo Approval'}
                  variant="secondary"
                  onPress={handleUndoApproval}
                  disabled={undoingApproval}
                  loading={undoingApproval}
                  style={styles.actionButton}
                />
              )}
            {(user?.role === 'procurement_officer' ||
              user?.role === 'super_admin' ||
              user?.is_superuser) &&
              !(request as any).has_awarded_quotation &&
              !(request as any).has_purchase_orders && (
                <View style={styles.actionsRow}>
                  <Button
                    title="Create Quotation Request"
                    variant="primary"
                    onPress={handleCreateQuotationRequest}
                    style={styles.actionButton}
                  />
                  <Button
                    title="Create LPO Directly"
                    variant="secondary"
                    onPress={handleCreatePurchaseOrder}
                    style={styles.actionButton}
                  />
                </View>
              )}
            {((request as any).has_awarded_quotation || (request as any).has_purchase_orders) && (
              <Card style={styles.infoCard}>
                <IconSymbol name="info.circle.fill" size={24} color={Colors.light.tint} />
                <View style={styles.infoContent}>
                  <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
                    {(request as any).has_purchase_orders
                      ? 'Purchase Order Created'
                      : 'Supplier Awarded'}
                  </ThemedText>
                  <ThemedText style={styles.infoText}>
                    {(request as any).has_purchase_orders
                      ? 'This Purchase Request has an active Purchase Order (LPO). Modifications to this request are no longer allowed as the procurement process has progressed to the order stage.'
                      : 'This Purchase Request has an awarded supplier. The quotation process is complete and modifications are restricted. You can proceed to create a Purchase Order (LPO) if needed.'}
                  </ThemedText>
                </View>
              </Card>
            )}
          </Card>
        )}

        {/* Tracking Timeline Link */}
        <TouchableOpacity
          onPress={() => router.push(`/purchase-requests/${id}/tracking` as any)}
          activeOpacity={0.7}>
          <Card style={styles.trackingCard}>
            <View style={styles.trackingContent}>
              <View style={styles.trackingInfo}>
                <ThemedText type="subtitle" style={styles.trackingTitle}>
                  Workflow Tracking
                </ThemedText>
                <ThemedText style={styles.trackingDescription}>
                  View complete timeline of this purchase request from creation to invoice payment
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={24} color={Colors.light.tint} />
            </View>
          </Card>
        </TouchableOpacity>
      </ScrollView>

      <RejectionReasonDialog
        isOpen={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleRejectConfirm}
        title="Reject Purchase Request"
        message="Please provide a reason for rejecting this request. This reason will be saved and visible to the requester."
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.screenContainer,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    ...CommonStyles.scrollContent,
  },
  loadingCard: {
    ...CommonStyles.loadingCard,
  },
  loadingText: {
    ...CommonStyles.loadingText,
  },
  emptyCard: {
    ...CommonStyles.emptyCard,
  },
  emptyText: {
    ...CommonStyles.emptyText,
  },
  header: {
    marginBottom: Layout.sectionMarginBottom,
    paddingTop: Spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
    padding: Spacing.xs,
  },
  backText: {
    fontSize: Typography.sizes.base,
    color: Colors.light.tint,
    fontWeight: Typography.weights.medium,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  detailsCard: {
    ...CommonStyles.card,
  },
  sectionTitle: {
    ...CommonStyles.sectionTitle,
  },
  detailsGrid: {
    gap: Spacing.md,
  },
  detailItem: {
    marginBottom: Spacing.md,
  },
  fullWidth: {
    width: '100%',
  },
  detailLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.normal,
    color: Colors.light.text,
  },
  rejectionBox: {
    padding: Spacing.md,
    backgroundColor: Colors.light.errorLight,
    borderWidth: 1,
    borderColor: Colors.light.error,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  rejectionText: {
    fontSize: Typography.sizes.base,
    color: Colors.light.error,
    fontWeight: Typography.weights.medium,
  },
  itemsCard: {
    ...CommonStyles.card,
  },
  itemRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  itemInfo: {
    marginBottom: Spacing.sm,
  },
  itemName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
    color: Colors.light.text,
  },
  itemCode: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textTertiary,
    fontWeight: Typography.weights.normal,
  },
  itemDetails: {
    gap: Spacing.xs,
  },
  itemDetail: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.normal,
  },
  actionsCard: {
    ...CommonStyles.card,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  actionButton: {
    ...CommonStyles.actionButton,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Layout.cardPadding,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
    color: Colors.light.text,
  },
  infoText: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    lineHeight: Typography.sizes.sm * 1.75, // relaxed line height (1.75)
    fontWeight: Typography.weights.normal,
  },
  trackingCard: {
    ...CommonStyles.card,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  trackingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  trackingInfo: {
    flex: 1,
  },
  trackingTitle: {
    marginBottom: Spacing.xs,
  },
  trackingDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.normal,
  },
});

