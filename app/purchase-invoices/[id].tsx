import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseInvoicesApi } from '@/lib/api/purchase-invoices';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import RejectionReasonDialog from '@/components/ui/RejectionReasonDialog';
import { PurchaseInvoice } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';

const statusColors: Record<string, string> = {
  draft: '#6c757d',
  pending: '#ffc107',
  approved: '#28a745',
  rejected: '#dc3545',
  paid: '#28a745',
  cancelled: '#dc3545',
  overdue: '#dc3545',
};

export default function PurchaseInvoiceDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const isSuperuser = user?.is_superuser ?? false;
  const canApprove =
    isSuperuser || (hasPermission('purchase_invoice', 'approve') ?? false);
  const canReject =
    isSuperuser || (hasPermission('purchase_invoice', 'reject') ?? false);
  const canMarkPaid =
    isSuperuser || (hasPermission('purchase_invoice', 'mark_paid') ?? false);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await purchaseInvoicesApi.getById(id);
      setInvoice(data);
    } catch (error: any) {
      console.error('Error loading purchase invoice:', error);
      toast(error.message || 'Failed to load purchase invoice', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInvoice();
  };

  const handleApprove = async () => {
    const confirmed = await confirm('Are you sure you want to approve this invoice?');
    if (!confirmed) return;

    try {
      setApproving(true);
      await purchaseInvoicesApi.approve(id);
      toast('Invoice approved successfully', 'success');
      loadInvoice();
    } catch (error: any) {
      toast(error.message || 'Failed to approve invoice', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = (reason: string) => {
    if (!reason.trim()) {
      toast('Please provide a rejection reason', 'error');
      return;
    }

    purchaseInvoicesApi
      .reject(id, reason)
      .then(() => {
        toast('Invoice rejected successfully', 'success');
        setRejectDialogOpen(false);
        loadInvoice();
      })
      .catch((error: any) => {
        toast(error.message || 'Failed to reject invoice', 'error');
      });
  };

  const handleMarkPaid = async () => {
    const confirmed = await confirm('Are you sure you want to mark this invoice as paid?');
    if (!confirmed) return;

    try {
      setMarkingPaid(true);
      await purchaseInvoicesApi.markPaid(id, {
        paid_amount: invoice?.total_amount,
        payment_date: new Date().toISOString().split('T')[0],
      });
      toast('Invoice marked as paid successfully', 'success');
      loadInvoice();
    } catch (error: any) {
      toast(error.message || 'Failed to mark invoice as paid', 'error');
    } finally {
      setMarkingPaid(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <ThemedText style={styles.loadingText}>Loading purchase invoice...</ThemedText>
      </ThemedView>
    );
  }

  if (!invoice) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.errorText}>Purchase invoice not found</ThemedText>
      </ThemedView>
    );
  }

  const getStatusColor = (status?: string) => {
    return statusColors[status?.toLowerCase() || ''] || '#0a7ea4';
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color={Colors.light.tint} />
            <ThemedText style={styles.backButtonText}>Back to Purchase Invoices</ThemedText>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <ThemedText type="title" style={styles.mainTitle}>
              {invoice.invoice_number || `INV-${id}`}
            </ThemedText>
            {invoice.status && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
                <ThemedText style={styles.statusText}>{invoice.status}</ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Invoice Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Invoice Information
          </ThemedText>
          {typeof invoice.supplier === 'object' && invoice.supplier?.name && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Supplier:</ThemedText>
              <ThemedText style={styles.value}>{invoice.supplier.name}</ThemedText>
            </View>
          )}
          {typeof invoice.purchase_order === 'object' && invoice.purchase_order?.order_number && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Purchase Order:</ThemedText>
              <TouchableOpacity
                onPress={() =>
                  router.push(`/purchase-orders/${invoice.purchase_order?.id || ''}` as any)
                }>
                <ThemedText style={[styles.value, styles.linkValue]}>
                  {invoice.purchase_order.order_number}
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
          {invoice.invoice_date && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Invoice Date:</ThemedText>
              <ThemedText style={styles.value}>
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </ThemedText>
            </View>
          )}
          {invoice.due_date && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Due Date:</ThemedText>
              <ThemedText style={styles.value}>
                {new Date(invoice.due_date).toLocaleDateString()}
              </ThemedText>
            </View>
          )}
          {invoice.notes && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Notes:</ThemedText>
              <ThemedText style={styles.value}>{invoice.notes}</ThemedText>
            </View>
          )}
        </Card>

        {/* Items */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Invoice Items
          </ThemedText>
          {invoice.items && invoice.items.length > 0 ? (
            invoice.items.map((item, index) => (
              <View key={item.id || index} style={styles.itemRow}>
                <View style={styles.itemDetails}>
                  <ThemedText type="defaultSemiBold">
                    {typeof item.product === 'object'
                      ? item.product?.name
                      : item.product || 'N/A'}
                  </ThemedText>
                  <ThemedText style={styles.itemSubText}>
                    Quantity: {item.quantity} {item.unit || ''}
                  </ThemedText>
                  {item.unit_price && (
                    <ThemedText style={styles.itemSubText}>
                      Unit Price: ${item.unit_price.toFixed(2)}
                    </ThemedText>
                  )}
                  {item.total && (
                    <ThemedText style={styles.itemSubText}>
                      Total: ${item.total.toFixed(2)}
                    </ThemedText>
                  )}
                </View>
              </View>
            ))
          ) : (
            <ThemedText style={styles.emptyText}>No items found</ThemedText>
          )}
        </Card>

        {/* Totals */}
        {(invoice.subtotal || invoice.tax_amount || invoice.total_amount) && (
          <Card style={styles.card}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Totals
            </ThemedText>
            {invoice.subtotal !== undefined && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Subtotal:</ThemedText>
                <ThemedText style={styles.value}>${invoice.subtotal.toFixed(2)}</ThemedText>
              </View>
            )}
            {invoice.tax_amount !== undefined && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Tax:</ThemedText>
                <ThemedText style={styles.value}>${invoice.tax_amount.toFixed(2)}</ThemedText>
              </View>
            )}
            {invoice.total_amount !== undefined && (
              <View style={[styles.detailRow, styles.totalRow]}>
                <ThemedText style={[styles.label, styles.totalLabel]}>Total:</ThemedText>
                <ThemedText style={[styles.value, styles.totalValue]}>
                  ${invoice.total_amount.toFixed(2)}
                </ThemedText>
              </View>
            )}
            {invoice.paid_amount !== undefined && invoice.paid_amount > 0 && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Paid Amount:</ThemedText>
                <ThemedText style={[styles.value, styles.paidValue]}>
                  ${invoice.paid_amount.toFixed(2)}
                </ThemedText>
              </View>
            )}
            {invoice.total_amount !== undefined &&
              invoice.paid_amount !== undefined &&
              invoice.total_amount > invoice.paid_amount && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.label}>Outstanding:</ThemedText>
                  <ThemedText style={[styles.value, styles.outstandingValue]}>
                    ${(invoice.total_amount - invoice.paid_amount).toFixed(2)}
                  </ThemedText>
                </View>
              )}
          </Card>
        )}

        {/* Actions */}
        {invoice.status === 'pending' && (canApprove || canReject) && (
          <View style={styles.actionsContainer}>
            {canApprove && (
              <Button
                title={approving ? 'Processing...' : 'Approve'}
                onPress={handleApprove}
                disabled={approving}
                variant="primary"
                style={styles.approveButton}
              />
            )}
            {canReject && (
              <Button
                title={rejecting ? 'Processing...' : 'Reject'}
                onPress={() => setRejectDialogOpen(true)}
                disabled={rejecting}
                variant="danger"
                style={styles.rejectButton}
              />
            )}
          </View>
        )}

        {invoice.status === 'approved' && canMarkPaid && (
          <View style={styles.actionsContainer}>
            <Button
              title={markingPaid ? 'Processing...' : 'Mark as Paid'}
              onPress={handleMarkPaid}
              disabled={markingPaid}
              variant="primary"
              style={styles.paidButton}
            />
          </View>
        )}

        <RejectionReasonDialog
          isOpen={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          onConfirm={handleReject}
          title="Reject Purchase Invoice"
          message="Please provide a reason for rejecting this invoice."
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.light.text,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.error,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl + Spacing.lg, // Extra bottom padding to avoid buttons
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 14,
    color: Colors.light.tint,
    marginLeft: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 15,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
    textAlign: 'right',
  },
  linkValue: {
    color: Colors.light.tint,
    textDecorationLine: 'underline',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  itemDetails: {
    flex: 1,
  },
  itemSubText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: Colors.light.textSecondary,
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.success,
  },
  paidValue: {
    color: Colors.light.success,
    fontWeight: '600',
  },
  outstandingValue: {
    color: Colors.light.error,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    gap: 10,
  },
  approveButton: {
    flex: 1,
    backgroundColor: Colors.light.success,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: Colors.light.error,
  },
  paidButton: {
    flex: 1,
    backgroundColor: Colors.light.success,
  },
});

