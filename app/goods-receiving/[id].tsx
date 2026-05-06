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
import { goodsReceivingApi, GoodsReceivedNote } from '@/lib/api/goods-receiving';
import { useAuth } from '@/contexts/AuthContext';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';

const statusColors: Record<string, string> = {
  draft: '#6c757d',
  partial: '#ffc107',
  completed: '#28a745',
  cancelled: '#dc3545',
};

const qualityStatusColors: Record<string, string> = {
  good: '#28a745',
  damaged: '#ffc107',
  defective: '#dc3545',
  missing: '#dc3545',
};

export default function GoodsReceivingDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const { user } = useAuth();
  const [grn, setGrn] = useState<GoodsReceivedNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingInvoiceDelivered, setMarkingInvoiceDelivered] = useState(false);

  useEffect(() => {
    loadGRN();
  }, [id]);

  const loadGRN = async () => {
    try {
      setLoading(true);
      const data = await goodsReceivingApi.getById(id);
      setGrn(data);
    } catch (error: any) {
      console.error('Error loading goods receiving note:', error);
      toast(error.message || 'Failed to load goods receiving note', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGRN();
  };

  const handleMarkInvoiceDelivered = async () => {
    const confirmed = await confirm(
      'Are you sure you want to mark the supplier invoice as delivered?'
    );
    if (!confirmed) return;

    try {
      setMarkingInvoiceDelivered(true);
      await goodsReceivingApi.markInvoiceDelivered(id);
      toast('Invoice marked as delivered successfully', 'success');
      loadGRN();
    } catch (error: any) {
      toast(error.message || 'Failed to mark invoice as delivered', 'error');
    } finally {
      setMarkingInvoiceDelivered(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <ThemedText style={styles.loadingText}>Loading goods receiving note...</ThemedText>
      </ThemedView>
    );
  }

  if (!grn) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.errorText}>Goods receiving note not found</ThemedText>
      </ThemedView>
    );
  }

  const getStatusColor = (status?: string) => {
    return statusColors[status?.toLowerCase() || ''] || '#0a7ea4';
  };

  const getQualityStatusColor = (status?: string) => {
    return qualityStatusColors[status?.toLowerCase() || ''] || '#0a7ea4';
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
            <ThemedText style={styles.backButtonText}>Back to Goods Receiving</ThemedText>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <ThemedText type="title" style={styles.mainTitle}>
              {grn.grn_number || `GRN-${id}`}
            </ThemedText>
            {grn.status && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(grn.status) }]}>
                <ThemedText style={styles.statusText}>{grn.status}</ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* GRN Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            GRN Information
          </ThemedText>
          {typeof grn.purchase_order === 'object' && grn.purchase_order?.order_number && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Purchase Order:</ThemedText>
              <TouchableOpacity
                onPress={() =>
                  router.push(`/purchase-orders/${grn.purchase_order?.id || ''}` as any)
                }>
                <ThemedText style={[styles.value, styles.linkValue]}>
                  {grn.purchase_order.order_number}
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
          {grn.receipt_date && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Receipt Date:</ThemedText>
              <ThemedText style={styles.value}>
                {new Date(grn.receipt_date).toLocaleDateString()}
              </ThemedText>
            </View>
          )}
          {grn.received_by_name && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Received By:</ThemedText>
              <ThemedText style={styles.value}>{grn.received_by_name}</ThemedText>
            </View>
          )}
          {grn.total_items !== undefined && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Total Items:</ThemedText>
              <ThemedText style={styles.value}>{grn.total_items}</ThemedText>
            </View>
          )}
          {grn.total_received_quantity !== undefined && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Total Received Quantity:</ThemedText>
              <ThemedText style={styles.value}>{grn.total_received_quantity}</ThemedText>
            </View>
          )}
          {grn.notes && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Notes:</ThemedText>
              <ThemedText style={styles.value}>{grn.notes}</ThemedText>
            </View>
          )}
        </Card>

        {/* Invoice Delivery Status */}
        {grn.invoice_delivery_status && (
          <Card style={styles.card}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Invoice Delivery Status
            </ThemedText>
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Status:</ThemedText>
              <Badge
                variant={grn.invoice_delivery_status === 'delivered' ? 'success' : 'warning'}
                text={
                  grn.invoice_delivery_status === 'delivered'
                    ? 'Delivered'
                    : 'Not Delivered'
                }
              />
            </View>
            {grn.supplier_invoice_file_url && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Invoice File:</ThemedText>
                <ThemedText style={[styles.value, styles.linkValue]}>View File</ThemedText>
              </View>
            )}
          </Card>
        )}

        {/* Items */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Received Items
          </ThemedText>
          {grn.items && grn.items.length > 0 ? (
            grn.items.map((item, index) => (
              <View key={item.id || index} style={styles.itemRow}>
                <View style={styles.itemDetails}>
                  <ThemedText type="defaultSemiBold">
                    {typeof item.product === 'object' ? item.product?.name : 'N/A'}
                  </ThemedText>
                  <View style={styles.quantityRow}>
                    <ThemedText style={styles.itemSubText}>
                      Ordered: {item.ordered_quantity}
                    </ThemedText>
                    <ThemedText style={styles.itemSubText}>
                      Received: {item.received_quantity}
                    </ThemedText>
                    {item.rejected_quantity > 0 && (
                      <ThemedText style={[styles.itemSubText, styles.rejectedText]}>
                        Rejected: {item.rejected_quantity}
                      </ThemedText>
                    )}
                  </View>
                  {item.quality_status && (
                    <View style={styles.qualityStatusContainer}>
                      <View
                        style={[
                          styles.qualityBadge,
                          { backgroundColor: getQualityStatusColor(item.quality_status) },
                        ]}>
                        <ThemedText style={styles.qualityStatusText}>
                          {item.quality_status.toUpperCase()}
                        </ThemedText>
                      </View>
                    </View>
                  )}
                  {item.notes && (
                    <ThemedText style={styles.itemSubText}>Notes: {item.notes}</ThemedText>
                  )}
                </View>
              </View>
            ))
          ) : (
            <ThemedText style={styles.emptyText}>No items found</ThemedText>
          )}
        </Card>

        {/* Actions */}
        {grn.invoice_delivery_status === 'not_delivered' && (
          <View style={styles.actionsContainer}>
            <Button
              title={
                markingInvoiceDelivered
                  ? 'Processing...'
                  : 'Mark Invoice as Delivered'
              }
              onPress={handleMarkInvoiceDelivered}
              disabled={markingInvoiceDelivered}
              variant="primary"
              style={styles.actionButton}
            />
          </View>
        )}
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
    alignItems: 'center',
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  itemDetails: {
    flex: 1,
  },
  quantityRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  itemSubText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  rejectedText: {
    color: Colors.light.error,
  },
  qualityStatusContainer: {
    marginTop: 8,
  },
  qualityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: Colors.light.textSecondary,
  },
  actionsContainer: {
    marginTop: 20,
    gap: 10,
  },
  actionButton: {
    marginBottom: 10,
  },
});

