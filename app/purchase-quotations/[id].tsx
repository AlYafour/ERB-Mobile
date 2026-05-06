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
import { purchaseQuotationsApi } from '@/lib/api/purchase-quotations';
import { useAuth } from '@/contexts/AuthContext';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PurchaseQuotation } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';

const statusColors: Record<string, string> = {
  pending: '#ffc107',
  accepted: '#28a745',
  rejected: '#dc3545',
  awarded: '#28a745',
};

export default function PurchaseQuotationDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const { user } = useAuth();
  const [quotation, setQuotation] = useState<PurchaseQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const isSuperuser = user?.is_superuser ?? false;
  const canAward = isSuperuser || user?.role === 'procurement_officer';

  useEffect(() => {
    loadQuotation();
  }, [id]);

  const loadQuotation = async () => {
    try {
      setLoading(true);
      const data = await purchaseQuotationsApi.getById(id);
      setQuotation(data);
    } catch (error: any) {
      console.error('Error loading purchase quotation:', error);
      toast(error.message || 'Failed to load purchase quotation', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadQuotation();
  };

  const handleAward = async () => {
    const confirmed = await confirm(
      'Are you sure you want to award this quotation? This will mark it as the selected supplier.'
    );
    if (!confirmed) return;

    try {
      setAwarding(true);
      await purchaseQuotationsApi.award(id);
      toast('Quotation awarded successfully', 'success');
      loadQuotation();
    } catch (error: any) {
      toast(error.message || 'Failed to award quotation', 'error');
    } finally {
      setAwarding(false);
    }
  };

  const handleReject = async () => {
    const confirmed = await confirm('Are you sure you want to reject this quotation?');
    if (!confirmed) return;

    try {
      setRejecting(true);
      await purchaseQuotationsApi.reject(id);
      toast('Quotation rejected successfully', 'success');
      loadQuotation();
    } catch (error: any) {
      toast(error.message || 'Failed to reject quotation', 'error');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <ThemedText style={styles.loadingText}>Loading purchase quotation...</ThemedText>
      </ThemedView>
    );
  }

  if (!quotation) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.errorText}>Purchase quotation not found</ThemedText>
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
            <ThemedText style={styles.backButtonText}>Back to Purchase Quotations</ThemedText>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <ThemedText type="title" style={styles.mainTitle}>
              {quotation.quotation_number || `PQ-${id}`}
            </ThemedText>
            {quotation.status && (
              <View
                style={[styles.statusBadge, { backgroundColor: getStatusColor(quotation.status) }]}>
                <ThemedText style={styles.statusText}>{quotation.status}</ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Quotation Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Quotation Information
          </ThemedText>
          {typeof quotation.supplier === 'object' && quotation.supplier?.name && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Supplier:</ThemedText>
              <ThemedText style={styles.value}>{quotation.supplier.name}</ThemedText>
            </View>
          )}
          {quotation.quotation_date && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Quotation Date:</ThemedText>
              <ThemedText style={styles.value}>
                {new Date(quotation.quotation_date).toLocaleDateString()}
              </ThemedText>
            </View>
          )}
          {quotation.valid_until && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Valid Until:</ThemedText>
              <ThemedText style={styles.value}>
                {new Date(quotation.valid_until).toLocaleDateString()}
              </ThemedText>
            </View>
          )}
          {quotation.payment_terms && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Payment Terms:</ThemedText>
              <ThemedText style={styles.value}>{quotation.payment_terms}</ThemedText>
            </View>
          )}
          {quotation.delivery_terms && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Delivery Terms:</ThemedText>
              <ThemedText style={styles.value}>{quotation.delivery_terms}</ThemedText>
            </View>
          )}
          {quotation.notes && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Notes:</ThemedText>
              <ThemedText style={styles.value}>{quotation.notes}</ThemedText>
            </View>
          )}
        </Card>

        {/* Items */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Quotation Items
          </ThemedText>
          {quotation.items && quotation.items.length > 0 ? (
            quotation.items.map((item, index) => (
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
        {(quotation.subtotal || quotation.tax_amount || quotation.total_amount) && (
          <Card style={styles.card}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Totals
            </ThemedText>
            {quotation.subtotal !== undefined && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Subtotal:</ThemedText>
                <ThemedText style={styles.value}>${quotation.subtotal.toFixed(2)}</ThemedText>
              </View>
            )}
            {quotation.tax_amount !== undefined && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Tax:</ThemedText>
                <ThemedText style={styles.value}>${quotation.tax_amount.toFixed(2)}</ThemedText>
              </View>
            )}
            {quotation.total_amount !== undefined && (
              <View style={[styles.detailRow, styles.totalRow]}>
                <ThemedText style={[styles.label, styles.totalLabel]}>Total:</ThemedText>
                <ThemedText style={[styles.value, styles.totalValue]}>
                  ${quotation.total_amount.toFixed(2)}
                </ThemedText>
              </View>
            )}
          </Card>
        )}

        {/* Actions */}
        {quotation.status === 'pending' && canAward && (
          <View style={styles.actionsContainer}>
            <Button
              title={awarding ? 'Processing...' : 'Award Quotation'}
              onPress={handleAward}
              disabled={awarding}
              variant="primary"
              style={styles.awardButton}
            />
            <Button
              title={rejecting ? 'Processing...' : 'Reject Quotation'}
              onPress={handleReject}
              disabled={rejecting}
              variant="danger"
              style={styles.rejectButton}
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
  awardButton: {
    flex: 1,
    backgroundColor: Colors.light.success,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: Colors.light.error,
  },
});

