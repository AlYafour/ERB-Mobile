import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GoodsReceiving, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { CommonStyles } from '@/constants/common-styles';

const C = Colors.light;

export default function GoodsReceivingScreen() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<GoodsReceiving[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadReceipts = async () => {
    try {
      const response = await apiClient.get<PaginatedResponse<GoodsReceiving>>(
        API_ENDPOINTS.GOODS_RECEIVING
      );
      if (response.data) {
        setReceipts(response.data.results || []);
      }
    } catch (error) {
      console.error('Error loading goods receiving:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadReceipts();
  };

  const filteredReceipts = receipts.filter(
    (receipt) =>
      receipt.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof receipt.purchase_order === 'object' &&
        receipt.purchase_order?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#28a745';
      case 'partial':
        return '#ffc107';
      case 'pending':
        return '#0a7ea4';
      default:
        return '#6c757d';
    }
  };

  const renderItem = ({ item }: { item: GoodsReceiving }) => (
    <TouchableOpacity onPress={() => router.push(`/goods-receiving/${item.id}` as any)}>
      <Card style={styles.receiptCard}>
        <View style={styles.receiptHeader}>
          <View style={styles.receiptInfo}>
            <ThemedText type="defaultSemiBold" style={styles.receiptNumber}>
              {item.receipt_number || `GR-${item.id ? String(item.id).slice(0, 8) : 'N/A'}`}
            </ThemedText>
            {item.status && (
              <Badge variant={item.status === 'completed' ? 'success' : item.status === 'partial' ? 'warning' : 'info'}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Badge>
            )}
          </View>
        </View>
        {typeof item.purchase_order === 'object' && item.purchase_order?.order_number && (
          <ThemedText style={styles.purchaseOrder}>
            PO: {item.purchase_order.order_number}
          </ThemedText>
        )}
        {typeof item.received_by === 'object' && item.received_by?.email && (
          <ThemedText style={styles.receivedBy}>Received by: {item.received_by.email}</ThemedText>
        )}
        {item.items && item.items.length > 0 && (
          <ThemedText style={styles.itemsCount}>
            {item.items.length} item{item.items.length > 1 ? 's' : ''} received
          </ThemedText>
        )}
        {item.received_at && (
          <ThemedText style={styles.dateText}>
            Received: {new Date(item.received_at).toLocaleDateString()}
          </ThemedText>
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.innerContainer}>
        <ScreenHeader title="Goods Receiving" />
        <View style={styles.searchContainer}>
          <Input
            placeholder="Search goods receiving..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={styles.searchInput}
          />
        </View>
        <FlatList
          data={filteredReceipts}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id || Math.random())}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              {loading ? 'Loading goods receiving...' : 'No goods receiving records found'}
            </ThemedText>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.screenContainer,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: C.background,
  },
  searchContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    ...CommonStyles.listContent,
  },
  receiptCard: {
    ...CommonStyles.itemCard,
  },
  receiptHeader: {
    marginBottom: Spacing.sm,
  },
  receiptInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  receiptNumber: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    flex: 1,
    letterSpacing: 0.2,
    color: Colors.light.text,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  purchaseOrder: {
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.weights.normal,
  },
  receivedBy: {
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.weights.normal,
  },
  itemsCount: {
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.weights.normal,
  },
  dateText: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textTertiary,
    fontWeight: Typography.weights.normal,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.medium,
  },
});

