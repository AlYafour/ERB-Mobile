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
import { suppliersApi } from '@/lib/api/suppliers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Supplier } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { CommonStyles } from '@/constants/common-styles';

export default function SupplierDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const { user } = useAuth();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.is_superuser || user?.is_staff;

  useEffect(() => {
    loadSupplier();
  }, [id]);

  const loadSupplier = async () => {
    try {
      setLoading(true);
      const data = await suppliersApi.getById(id);
      setSupplier(data);
    } catch (error: any) {
      console.error('Error loading supplier:', error);
      toast(error.message || 'Failed to load supplier', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSupplier();
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <ThemedText style={styles.loadingText}>Loading supplier...</ThemedText>
      </ThemedView>
    );
  }

  if (!supplier) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.errorText}>Supplier not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color={Colors.light.tint} />
            <ThemedText style={styles.backButtonText}>Back to Suppliers</ThemedText>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <ThemedText type="title" style={styles.mainTitle}>
              {supplier.business_name || supplier.name || 'Unnamed Supplier'}
            </ThemedText>
            {supplier.supplier_number && (
              <ThemedText style={styles.subtitle}>{supplier.supplier_number}</ThemedText>
            )}
            <View style={styles.statusContainer}>
              <Badge variant={supplier.is_active ? 'success' : 'error'}>
                {supplier.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </View>
          </View>
        </View>

        {/* Business Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Business Information
          </ThemedText>
          {supplier.business_name && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Business Name:</ThemedText>
              <ThemedText style={styles.value}>{supplier.business_name}</ThemedText>
            </View>
          )}
          {supplier.name && supplier.name !== supplier.business_name && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Name:</ThemedText>
              <ThemedText style={styles.value}>{supplier.name}</ThemedText>
            </View>
          )}
          {supplier.supplier_number && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Supplier Number:</ThemedText>
              <ThemedText style={styles.value}>{supplier.supplier_number}</ThemedText>
            </View>
          )}
          {supplier.trn && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>TRN:</ThemedText>
              <ThemedText style={styles.value}>{supplier.trn}</ThemedText>
            </View>
          )}
          {supplier.tax_id && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Tax ID:</ThemedText>
              <ThemedText style={styles.value}>{supplier.tax_id}</ThemedText>
            </View>
          )}
          {supplier.currency && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Currency:</ThemedText>
              <ThemedText style={styles.value}>{supplier.currency}</ThemedText>
            </View>
          )}
        </Card>

        {/* Contact Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Contact Information
          </ThemedText>
          {supplier.contact_person && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Contact Person:</ThemedText>
              <ThemedText style={styles.value}>{supplier.contact_person}</ThemedText>
            </View>
          )}
          {supplier.first_name && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>First Name:</ThemedText>
              <ThemedText style={styles.value}>{supplier.first_name}</ThemedText>
            </View>
          )}
          {supplier.last_name && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Last Name:</ThemedText>
              <ThemedText style={styles.value}>{supplier.last_name}</ThemedText>
            </View>
          )}
          {supplier.email && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Email:</ThemedText>
              <ThemedText style={styles.value}>{supplier.email}</ThemedText>
            </View>
          )}
          {supplier.phone && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Phone:</ThemedText>
              <ThemedText style={styles.value}>{supplier.phone}</ThemedText>
            </View>
          )}
          {supplier.telephone && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Telephone:</ThemedText>
              <ThemedText style={styles.value}>{supplier.telephone}</ThemedText>
            </View>
          )}
          {supplier.mobile && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Mobile:</ThemedText>
              <ThemedText style={styles.value}>{supplier.mobile}</ThemedText>
            </View>
          )}
        </Card>

        {/* Address Information */}
        {(supplier.address || supplier.city || supplier.state || supplier.country) && (
          <Card style={styles.card}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Address Information
            </ThemedText>
            {supplier.address && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Address:</ThemedText>
                <ThemedText style={styles.value}>{supplier.address}</ThemedText>
              </View>
            )}
            {supplier.city && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>City:</ThemedText>
                <ThemedText style={styles.value}>{supplier.city}</ThemedText>
              </View>
            )}
            {supplier.state && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>State:</ThemedText>
                <ThemedText style={styles.value}>{supplier.state}</ThemedText>
              </View>
            )}
            {supplier.country && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Country:</ThemedText>
                <ThemedText style={styles.value}>{supplier.country}</ThemedText>
              </View>
            )}
          </Card>
        )}

        {/* Actions */}
        {isAdmin && (
          <View style={styles.actionsContainer}>
            <Button
              title="Edit Supplier"
              onPress={() => router.push(`/suppliers/${id}/edit` as any)}
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
  actionsContainer: {
    marginTop: Layout.sectionMarginTop,
    gap: Spacing.md,
  },
  actionButton: {
    marginBottom: 0,
  },
});

