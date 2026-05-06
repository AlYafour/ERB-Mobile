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
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import RejectionReasonDialog from '@/components/ui/RejectionReasonDialog';
import { PurchaseOrder } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';

const statusColors: Record<string, string> = {
  pending: '#ffc107',
  approved: '#28a745',
  rejected: '#dc3545',
  completed: '#28a745',
  cancelled: '#dc3545',
  'in transit': '#17a2b8',
};

export default function PurchaseOrderDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const isSuperuser = user?.is_superuser ?? false;
  const canApprove =
    isSuperuser || (hasPermission('purchase_order', 'approve') ?? false);
  const canReject =
    isSuperuser || (hasPermission('purchase_order', 'reject') ?? false);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrdersApi.getById(id);
      setOrder(data);
    } catch (error: any) {
      console.error('Error loading purchase order:', error);
      toast(error.message || 'Failed to load purchase order', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrder();
  };

  const handleApprove = async () => {
    const confirmed = await confirm('Are you sure you want to approve this order?');
    if (!confirmed) return;

    try {
      setApproving(true);
      await purchaseOrdersApi.approve(id);
      toast('Order approved successfully', 'success');
      loadOrder();
    } catch (error: any) {
      toast(error.message || 'Failed to approve order', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = (reason: string) => {
    if (!reason.trim()) {
      toast('Please provide a rejection reason', 'error');
      return;
    }

    purchaseOrdersApi
      .reject(id, reason)
      .then(() => {
        toast('Order rejected successfully', 'success');
        setRejectDialogOpen(false);
        loadOrder();
      })
      .catch((error: any) => {
        toast(error.message || 'Failed to reject order', 'error');
      });
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <ThemedText style={styles.loadingText}>Loading purchase order...</ThemedText>
      </ThemedView>
    );
  }

  if (!order) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.errorText}>Purchase order not found</ThemedText>
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
            <ThemedText style={styles.backButtonText}>Back to Purchase Orders</ThemedText>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <ThemedText type="title" style={styles.mainTitle}>
              {order.order_number || `PO-${id}`}
            </ThemedText>
            {order.status && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                <ThemedText style={styles.statusText}>{order.status}</ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Order Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Order Information
          </ThemedText>
          {typeof order.supplier === 'object' && order.supplier?.name && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Supplier:</ThemedText>
              <ThemedText style={styles.value}>{order.supplier.name}</ThemedText>
            </View>
          )}
          {order.order_date && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Order Date:</ThemedText>
              <ThemedText style={styles.value}>
                {new Date(order.order_date).toLocaleDateString()}
              </ThemedText>
            </View>
          )}
          {order.delivery_date && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Delivery Date:</ThemedText>
              <ThemedText style={styles.value}>
                {new Date(order.delivery_date).toLocaleDateString()}
              </ThemedText>
            </View>
          )}
          {order.payment_terms && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Payment Terms:</ThemedText>
              <ThemedText style={styles.value}>{order.payment_terms}</ThemedText>
            </View>
          )}
          {order.delivery_terms && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Delivery Terms:</ThemedText>
              <ThemedText style={styles.value}>{order.delivery_terms}</ThemedText>
            </View>
          )}
          {order.notes && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Notes:</ThemedText>
              <ThemedText style={styles.value}>{order.notes}</ThemedText>
            </View>
          )}
        </Card>

        {/* Items */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Order Items
          </ThemedText>
          {order.items && order.items.length > 0 ? (
            order.items.map((item, index) => (
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
        {(order.subtotal || order.tax_amount || order.total_amount) && (
          <Card style={styles.card}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Totals
            </ThemedText>
            {order.subtotal !== undefined && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Subtotal:</ThemedText>
                <ThemedText style={styles.value}>${order.subtotal.toFixed(2)}</ThemedText>
              </View>
            )}
            {order.tax_amount !== undefined && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Tax:</ThemedText>
                <ThemedText style={styles.value}>${order.tax_amount.toFixed(2)}</ThemedText>
              </View>
            )}
            {order.total_amount !== undefined && (
              <View style={[styles.detailRow, styles.totalRow]}>
                <ThemedText style={[styles.label, styles.totalLabel]}>Total:</ThemedText>
                <ThemedText style={[styles.value, styles.totalValue]}>
                  ${order.total_amount.toFixed(2)}
                </ThemedText>
              </View>
            )}
          </Card>
        )}

        {/* Actions */}
        {order.status === 'pending' && (canApprove || canReject) && (
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

        <RejectionReasonDialog
          isOpen={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          onConfirm={handleReject}
          title="Reject Purchase Order"
          message="Please provide a reason for rejecting this order."
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
});

