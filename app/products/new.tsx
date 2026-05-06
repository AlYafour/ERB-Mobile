import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { productsApi } from '@/lib/api/products';
import { suppliersApi } from '@/lib/api/suppliers';
import { toast } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { CommonStyles } from '@/constants/common-styles';
import { Supplier } from '@/types';

const units = [
  { value: 'piece', label: 'Piece' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'g', label: 'Gram' },
  { value: 'liter', label: 'Liter' },
  { value: 'ml', label: 'Milliliter' },
  { value: 'meter', label: 'Meter' },
  { value: 'cm', label: 'Centimeter' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
];

const discountTypes = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed Amount' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

export default function NewProductScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    sku: '',
    barcode: '',
    description: '',
    brand: '',
    category: '',
    unit: 'piece',
    supplier: undefined as number | undefined,
    unit_price: 0,
    buy_price: 0,
    discount: 0,
    discount_type: 'percentage',
    track_stock: false,
    stock_balance: 0,
    min_stock_level: 0,
    status: 'active',
    is_active: true,
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const response = await suppliersApi.getAll({ page_size: 100 });
      if (response.results) {
        setSuppliers(response.results);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast('Product name is required', 'error');
      return;
    }

    try {
      setLoading(true);
      await productsApi.create(formData);
      toast('Product created successfully', 'success');
      router.back();
    } catch (error: any) {
      toast(error.message || 'Failed to create product', 'error');
    } finally {
      setLoading(false);
    }
  };

  const supplierOptions = suppliers.map((s) => ({
    value: Number(s.id),
    label: s.business_name || s.name || `Supplier ${s.id}`,
  }));

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color={Colors.light.tint} />
            <ThemedText style={styles.backButtonText}>Back to Products</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title" style={styles.mainTitle}>
            New Product
          </ThemedText>
        </View>

        {/* Basic Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Basic Information
          </ThemedText>
          <Input
            label="Product Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter product name"
          />
          <Input
            label="Product Code"
            value={formData.code}
            onChangeText={(text) => setFormData({ ...formData, code: text })}
            placeholder="Enter product code"
          />
          <Input
            label="SKU"
            value={formData.sku}
            onChangeText={(text) => setFormData({ ...formData, sku: text })}
            placeholder="Enter SKU"
          />
          <Input
            label="Barcode"
            value={formData.barcode}
            onChangeText={(text) => setFormData({ ...formData, barcode: text })}
            placeholder="Enter barcode"
          />
          <Input
            label="Description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Enter description"
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
          <Input
            label="Brand"
            value={formData.brand}
            onChangeText={(text) => setFormData({ ...formData, brand: text })}
            placeholder="Enter brand"
          />
          <Input
            label="Category"
            value={formData.category}
            onChangeText={(text) => setFormData({ ...formData, category: text })}
            placeholder="Enter category"
          />
          <SearchableDropdown
            label="Unit"
            options={units}
            value={formData.unit}
            onChange={(value) => setFormData({ ...formData, unit: value as string })}
            placeholder="Select unit"
          />
          {supplierOptions.length > 0 && (
            <SearchableDropdown
              label="Supplier"
              options={supplierOptions}
              value={formData.supplier}
              onChange={(value) => setFormData({ ...formData, supplier: value as number | undefined })}
              placeholder="Select supplier"
              allowClear
            />
          )}
        </Card>

        {/* Pricing Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Pricing Information
          </ThemedText>
          <Input
            label="Unit Price"
            value={formData.unit_price.toString()}
            onChangeText={(text) =>
              setFormData({ ...formData, unit_price: parseFloat(text) || 0 })
            }
            placeholder="0.00"
            keyboardType="numeric"
          />
          <Input
            label="Buy Price"
            value={formData.buy_price.toString()}
            onChangeText={(text) =>
              setFormData({ ...formData, buy_price: parseFloat(text) || 0 })
            }
            placeholder="0.00"
            keyboardType="numeric"
          />
          <SearchableDropdown
            label="Discount Type"
            options={discountTypes}
            value={formData.discount_type}
            onChange={(value) => setFormData({ ...formData, discount_type: value as string })}
            placeholder="Select discount type"
          />
          <Input
            label="Discount"
            value={formData.discount.toString()}
            onChangeText={(text) =>
              setFormData({ ...formData, discount: parseFloat(text) || 0 })
            }
            placeholder="0"
            keyboardType="numeric"
          />
        </Card>

        {/* Stock Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Stock Information
          </ThemedText>
          <View style={styles.checkboxContainer}>
            <Checkbox
              checked={formData.track_stock}
              onChange={(checked) => setFormData({ ...formData, track_stock: checked })}
              title="Track Stock"
            />
          </View>
          {formData.track_stock && (
            <>
              <Input
                label="Stock Balance"
                value={formData.stock_balance.toString()}
                onChangeText={(text) =>
                  setFormData({ ...formData, stock_balance: parseInt(text) || 0 })
                }
                placeholder="0"
                keyboardType="numeric"
              />
              <Input
                label="Min Stock Level"
                value={formData.min_stock_level.toString()}
                onChangeText={(text) =>
                  setFormData({ ...formData, min_stock_level: parseInt(text) || 0 })
                }
                placeholder="0"
                keyboardType="numeric"
              />
            </>
          )}
        </Card>

        {/* Status */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Status
          </ThemedText>
          <SearchableDropdown
            label="Status"
            options={statusOptions}
            value={formData.status}
            onChange={(value) => setFormData({ ...formData, status: value as string })}
            placeholder="Select status"
          />
          <View style={styles.checkboxContainer}>
            <Checkbox
              checked={formData.is_active}
              onChange={(checked) => setFormData({ ...formData, is_active: checked })}
              title="Active"
            />
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title={loading ? 'Creating...' : 'Create Product'}
            onPress={handleSubmit}
            disabled={loading}
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.screenContainer,
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
  mainTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.5,
  },
  card: {
    ...CommonStyles.card,
  },
  sectionTitle: {
    ...CommonStyles.sectionTitle,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.sizes.base,
    borderColor: Colors.light.border,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  checkboxContainer: {
    marginTop: Spacing.sm,
  },
  actionsContainer: {
    ...CommonStyles.submitContainer,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

