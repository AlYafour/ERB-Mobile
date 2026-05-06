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
import { quotationRequestsApi } from '@/lib/api/quotation-requests';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { QuotationRequest } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';

const statusColors: Record<string, string> = {
  pending: '#ffc107',
  completed: '#28a745',
  cancelled: '#dc3545',
};

export default function QuotationRequestDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const [request, setRequest] = useState<QuotationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const data = await quotationRequestsApi.getById(id);
      setRequest(data);
    } catch (error: any) {
      console.error('Error loading quotation request:', error);
      toast(error.message || 'Failed to load quotation request', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRequest();
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <ThemedText style={styles.loadingText}>Loading quotation request...</ThemedText>
      </ThemedView>
    );
  }

  if (!request) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.errorText}>Quotation request not found</ThemedText>
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
            <ThemedText style={styles.backButtonText}>Back to Quotation Requests</ThemedText>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <ThemedText type="title" style={styles.mainTitle}>
              {request.request_number || `QR-${id}`}
            </ThemedText>
            {request.status && (
              <View
                style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                <ThemedText style={styles.statusText}>{request.status}</ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Request Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Request Information
          </ThemedText>
          {typeof request.purchase_request === 'object' &&
            request.purchase_request?.request_number && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Purchase Request:</ThemedText>
                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      `/purchase-requests/${request.purchase_request?.id || ''}` as any
                    )
                  }>
                  <ThemedText style={[styles.value, styles.linkValue]}>
                    {request.purchase_request.request_number}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          {request.created_at && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Created At:</ThemedText>
              <ThemedText style={styles.value}>
                {new Date(request.created_at).toLocaleDateString()}
              </ThemedText>
            </View>
          )}
          {request.notes && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Notes:</ThemedText>
              <ThemedText style={styles.value}>{request.notes}</ThemedText>
            </View>
          )}
        </Card>

        {/* Suppliers */}
        {request.suppliers && Array.isArray(request.suppliers) && request.suppliers.length > 0 && (
          <Card style={styles.card}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Requested Suppliers ({request.suppliers.length})
            </ThemedText>
            {request.suppliers.map((supplier, index) => (
              <View key={index} style={styles.supplierRow}>
                <ThemedText type="defaultSemiBold">
                  {typeof supplier === 'object' ? supplier.name || supplier.business_name : supplier}
                </ThemedText>
                {typeof supplier === 'object' && supplier.email && (
                  <ThemedText style={styles.supplierSubText}>{supplier.email}</ThemedText>
                )}
              </View>
            ))}
          </Card>
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
  linkValue: {
    color: Colors.light.tint,
    textDecorationLine: 'underline',
  },
  supplierRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  supplierSubText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
});

