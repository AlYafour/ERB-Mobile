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
import { productsApi } from '@/lib/api/products';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Product } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { CommonStyles } from '@/constants/common-styles';

export default function ProductDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.is_superuser || user?.is_staff;

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getById(id);
      setProduct(data);
    } catch (error: any) {
      console.error('Error loading product:', error);
      toast(error.message || 'Failed to load product', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProduct();
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <ThemedText style={styles.loadingText}>Loading product...</ThemedText>
      </ThemedView>
    );
  }

  if (!product) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.errorText}>Product not found</ThemedText>
      </ThemedView>
    );
  }

  const getStatusVariant = () => {
    if (!product.is_active) return 'error';
    if (product.status === 'active') return 'success';
    if (product.status === 'inactive') return 'error';
    return 'info';
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
            <ThemedText style={styles.backButtonText}>Back to Products</ThemedText>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <ThemedText type="title" style={styles.mainTitle}>
              {product.name || 'Unnamed Product'}
            </ThemedText>
            {product.code && <ThemedText style={styles.subtitle}>{product.code}</ThemedText>}
            <View style={styles.statusContainer}>
              <Badge variant={getStatusVariant()}>
                {product.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </View>
          </View>
        </View>

        {/* Basic Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Basic Information
          </ThemedText>
          {product.name && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Name:</ThemedText>
              <ThemedText style={styles.value}>{product.name}</ThemedText>
            </View>
          )}
          {product.code && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Code:</ThemedText>
              <ThemedText style={styles.value}>{product.code}</ThemedText>
            </View>
          )}
          {product.sku && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>SKU:</ThemedText>
              <ThemedText style={styles.value}>{product.sku}</ThemedText>
            </View>
          )}
          {product.barcode && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Barcode:</ThemedText>
              <ThemedText style={styles.value}>{product.barcode}</ThemedText>
            </View>
          )}
          {product.description && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Description:</ThemedText>
              <ThemedText style={styles.value}>{product.description}</ThemedText>
            </View>
          )}
          {product.brand && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Brand:</ThemedText>
              <ThemedText style={styles.value}>{product.brand}</ThemedText>
            </View>
          )}
          {product.category && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Category:</ThemedText>
              <ThemedText style={styles.value}>{product.category}</ThemedText>
            </View>
          )}
          {product.unit && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Unit:</ThemedText>
              <ThemedText style={styles.value}>{product.unit}</ThemedText>
            </View>
          )}
        </Card>

        {/* Pricing Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Pricing Information
          </ThemedText>
          {product.unit_price !== undefined && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Unit Price:</ThemedText>
              <ThemedText style={[styles.value, styles.priceValue]}>
                ${product.unit_price.toFixed(2)}
              </ThemedText>
            </View>
          )}
          {product.buy_price !== undefined && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Buy Price:</ThemedText>
              <ThemedText style={[styles.value, styles.priceValue]}>
                ${product.buy_price.toFixed(2)}
              </ThemedText>
            </View>
          )}
          {product.discount !== undefined && product.discount > 0 && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Discount:</ThemedText>
              <ThemedText style={styles.value}>
                {product.discount_type === 'percentage'
                  ? `${product.discount}%`
                  : `$${product.discount.toFixed(2)}`}
              </ThemedText>
            </View>
          )}
        </Card>

        {/* Stock Information */}
        {product.track_stock && (
          <Card style={styles.card}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Stock Information
            </ThemedText>
            {product.stock_balance !== undefined && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Stock Balance:</ThemedText>
                <ThemedText style={styles.value}>{product.stock_balance}</ThemedText>
              </View>
            )}
            {product.min_stock_level !== undefined && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Min Stock Level:</ThemedText>
                <ThemedText style={styles.value}>{product.min_stock_level}</ThemedText>
              </View>
            )}
            {product.max_stock_level !== undefined && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Max Stock Level:</ThemedText>
                <ThemedText style={styles.value}>{product.max_stock_level}</ThemedText>
              </View>
            )}
          </Card>
        )}

        {/* Actions */}
        {isAdmin && (
          <View style={styles.actionsContainer}>
            <Button
              title="Edit Product"
              onPress={() => router.push(`/products/${id}/edit` as any)}
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
    ...CommonStyles.screenContainer,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.light.text,
    fontWeight: Typography.weights.medium,
  },
  errorText: {
    fontSize: Typography.sizes.base,
    color: Colors.light.error,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },
  scrollContent: {
    ...CommonStyles.scrollContent,
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
  backButtonText: {
    fontSize: Typography.sizes.base,
    color: Colors.light.tint,
    fontWeight: Typography.weights.medium,
  },
  titleContainer: {
    marginBottom: Spacing.xs,
  },
  mainTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: Typography.weights.normal,
  },
  statusContainer: {
    marginTop: Spacing.sm,
  },
  card: {
    ...CommonStyles.card,
  },
  sectionTitle: {
    ...CommonStyles.sectionTitle,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: Typography.sizes.base,
    color: Colors.light.text,
    flex: 1,
    textAlign: 'right',
    fontWeight: Typography.weights.normal,
  },
  priceValue: {
    color: Colors.light.success,
    fontWeight: Typography.weights.semibold,
  },
  actionsContainer: {
    marginTop: Layout.sectionMarginTop,
    gap: Spacing.md,
  },
  actionButton: {
    marginBottom: 0,
  },
});

