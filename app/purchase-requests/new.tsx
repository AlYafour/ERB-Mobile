import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { productsApi } from '@/lib/api/products';
import { projectsApi } from '@/lib/api/projects';
import { toast } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { Product, Project, PurchaseRequestItem } from '@/types';
import { usePermissions } from '@/lib/hooks/use-permissions';

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

interface PurchaseRequestItemForm {
  product_id: number;
  product?: Product;
  quantity: number;
  unit: string;
  project_site: string;
  reason: string;
  notes: string;
}

export default function NewPurchaseRequestScreen() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_id: undefined as number | undefined,
    project_code: '',
    title: '',
    request_date: new Date().toISOString().split('T')[0],
    required_by: '',
    notes: '',
  });

  const [items, setItems] = useState<PurchaseRequestItemForm[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentItem, setCurrentItem] = useState({
    quantity: 1,
    unit: '',
    project_site: '',
    reason: '',
    notes: '',
  });
  const [projectsData, setProjectsData] = useState<{ results: Project[] } | null>(null);
  const [productsData, setProductsData] = useState<{ results: Product[] } | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Check permissions
  const canCreate = hasPermission('purchase_request', 'create');

  useEffect(() => {
    if (!canCreate) {
      toast('You do not have permission to create purchase requests', 'error');
      router.back();
      return;
    }
    loadProjects();
    loadProducts();
  }, [canCreate]);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await projectsApi.getAll({ page: 1, page_size: 1000, is_active: true });
      setProjectsData(response);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await productsApi.getAll({ page: 1, page_size: 1000 });
      setProductsData(response);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Handle project selection
  const handleProjectChange = (projectId: number | null | undefined) => {
    if (projectId) {
      const selectedProject = projectsData?.results.find((p: Project) => Number(p.id) === Number(projectId));
      if (selectedProject) {
        setFormData({
          ...formData,
          project_id: projectId,
          project_code: selectedProject.code || '',
          title: selectedProject.name || '', // Auto-fill title from project name
        });
      }
    } else {
      setFormData({
        ...formData,
        project_id: undefined,
        project_code: '',
        title: '',
      });
    }
  };

  // Handle product selection
  const handleProductSelect = (product: Product | null) => {
    setSelectedProduct(product);
    if (product) {
      setCurrentItem({
        ...currentItem,
        unit: product.unit || '',
      });
    }
  };

  // Filter products by category
  const filteredProducts = productsData?.results?.filter((product: Product) => {
    if (!selectedCategory) return true;
    return product.category === selectedCategory;
  }) || [];

  // Get unique categories
  const categories = Array.from(
    new Set(productsData?.results?.map((p: Product) => p.category).filter((cat): cat is string => Boolean(cat)) || [])
  );

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast('Please select a product first', 'warning');
      return;
    }
    if (currentItem.quantity <= 0 || !Number.isInteger(currentItem.quantity)) {
      toast('Please enter a valid whole number quantity', 'warning');
      return;
    }

    const newItem: PurchaseRequestItemForm = {
      product_id: Number(selectedProduct.id),
      product: selectedProduct,
      quantity: Math.floor(currentItem.quantity),
      unit: currentItem.unit || selectedProduct.unit || '',
      project_site: currentItem.project_site || '',
      reason: currentItem.reason,
      notes: currentItem.notes,
    };

    setItems([...items, newItem]);
    
    // Reset form
    setSelectedProduct(null);
    setCurrentItem({
      quantity: 1,
      unit: '',
      project_site: '',
      reason: '',
      notes: '',
    });
    
    toast('Product added successfully!', 'success');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast('Product removed', 'info');
  };

  const handleUpdateItem = (index: number, field: keyof PurchaseRequestItemForm, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast('Please add at least one product', 'warning');
      return;
    }
    if (!formData.title) {
      toast('Title is required', 'warning');
      return;
    }
    if (!formData.request_date) {
      toast('Request date is required', 'warning');
      return;
    }
    if (!formData.required_by) {
      toast('Required by date is required', 'warning');
      return;
    }

    try {
      setLoading(true);
      const itemsToSubmit = items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit: item.unit,
        project_site: item.project_site || '',
        reason: item.reason,
        notes: item.notes,
      }));

      await purchaseRequestsApi.create({
        project_id: formData.project_id || null,
        title: formData.title,
        request_date: formData.request_date,
        required_by: formData.required_by,
        notes: formData.notes || '',
        items: itemsToSubmit,
      });

      toast('Purchase request created successfully', 'success');
      router.back();
    } catch (error: any) {
      toast(error.message || 'Failed to create purchase request', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!canCreate) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Create Purchase Request
          </ThemedText>
        </View>

        {/* Form Card */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Request Details
          </ThemedText>

          {/* Project Selection */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>
              Project <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <SearchableDropdown
              options={
                projectsData?.results.map((project: Project) => ({
                  value: project.id,
                  label: `${project.name} (${project.code || ''})`,
                  searchText: `${project.name} ${project.code || ''} ${project.location || ''}`,
                })) || []
              }
              value={formData.project_id}
              onChange={(val) => handleProjectChange(val ? Number(val) : undefined)}
              placeholder="Select Project"
              searchPlaceholder="Search by name or code..."
              allowClear
            />
          </View>

          {/* Project Code */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Project Code</ThemedText>
            <Input
              placeholder="Enter project code"
              value={formData.project_code}
              onChangeText={(text) => setFormData({ ...formData, project_code: text })}
            />
          </View>

          {/* Title */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>
              Title <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <Input
              placeholder="Auto-filled from project name"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          {/* Request Date */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>
              Request Date <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <Input
              placeholder="YYYY-MM-DD"
              value={formData.request_date}
              onChangeText={(text) => setFormData({ ...formData, request_date: text })}
            />
          </View>

          {/* Required By */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>
              Required By <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <Input
              placeholder="YYYY-MM-DD"
              value={formData.required_by}
              onChangeText={(text) => setFormData({ ...formData, required_by: text })}
            />
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>General Notes</ThemedText>
            <TextInput
              style={[styles.textArea, { color: Colors.light.text, borderColor: Colors.light.border }]}
              placeholder="Additional notes..."
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              multiline
              numberOfLines={3}
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>
        </Card>

        {/* Items Section */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Required Products
          </ThemedText>

          {/* Category Filter */}
          {categories.length > 0 && (
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Filter by Category</ThemedText>
              <SearchableDropdown
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.filter(Boolean).map((cat) => ({ value: cat, label: cat })),
                ]}
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val ? String(val) : '')}
                placeholder="All Categories"
                allowClear
              />
            </View>
          )}

          {/* Product Selection */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Select Product</ThemedText>
            <SearchableDropdown
              options={filteredProducts.map((product: Product) => ({
                value: product.id,
                label: `${product.name} (${product.code || 'N/A'})`,
                searchText: `${product.name} ${product.code || ''} ${product.category || ''}`,
              }))}
              value={selectedProduct?.id}
              onChange={(val) => {
                const product = filteredProducts.find((p: Product) => p.id === val);
                handleProductSelect(product || null);
              }}
              placeholder="Select Product"
              searchPlaceholder="Search products..."
              allowClear
            />
          </View>

          {/* Product Details Form */}
          {selectedProduct && (
            <Card style={styles.itemFormCard}>
              <ThemedText type="defaultSemiBold" style={styles.productName}>
                {selectedProduct.name}
              </ThemedText>
              {selectedProduct.code && (
                <ThemedText style={styles.productCode}>Code: {selectedProduct.code}</ThemedText>
              )}

              <View style={styles.formRow}>
                <View style={styles.formGroupHalf}>
                  <ThemedText style={styles.label}>
                    Quantity <ThemedText style={styles.required}>*</ThemedText>
                  </ThemedText>
                  <Input
                    placeholder="1"
                    value={String(currentItem.quantity)}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 1;
                      setCurrentItem({ ...currentItem, quantity: num });
                    }}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroupHalf}>
                  <ThemedText style={styles.label}>Unit</ThemedText>
                  <SearchableDropdown
                    options={units}
                    value={currentItem.unit}
                    onChange={(val) => setCurrentItem({ ...currentItem, unit: String(val || '') })}
                    placeholder="Select Unit"
                    allowClear
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Reason/Purpose</ThemedText>
                <TextInput
                  style={[styles.textArea, { color: Colors.light.text, borderColor: Colors.light.border }]}
                  placeholder="Why is this needed?"
                  value={currentItem.reason}
                  onChangeText={(text) => setCurrentItem({ ...currentItem, reason: text })}
                  multiline
                  numberOfLines={2}
                  placeholderTextColor={Colors.light.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Notes</ThemedText>
                <TextInput
                  style={[styles.textArea, { color: Colors.light.text, borderColor: Colors.light.border }]}
                  placeholder="Additional notes"
                  value={currentItem.notes}
                  onChangeText={(text) => setCurrentItem({ ...currentItem, notes: text })}
                  multiline
                  numberOfLines={2}
                  placeholderTextColor={Colors.light.textSecondary}
                />
              </View>

              <View style={styles.buttonRow}>
                <Button
                  title="Add Product"
                  variant="primary"
                  onPress={handleAddItem}
                  style={styles.addButton}
                />
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setSelectedProduct(null);
                    setCurrentItem({
                      quantity: 1,
                      unit: '',
                      project_site: '',
                      reason: '',
                      notes: '',
                    });
                  }}
                />
              </View>
            </Card>
          )}

          {/* Items List */}
          {items.length > 0 && (
            <View style={styles.itemsList}>
              <ThemedText type="defaultSemiBold" style={styles.itemsTitle}>
                Added Products ({items.length})
              </ThemedText>
              {items.map((item, index) => {
                const product = item.product || productsData?.results.find((p: Product) => Number(p.id) === Number(item.product_id));
                return (
                  <Card key={index} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemInfo}>
                        <ThemedText type="defaultSemiBold">{product?.name || 'Unknown Product'}</ThemedText>
                        {product?.code && (
                          <ThemedText style={styles.itemCode}>Code: {product.code}</ThemedText>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveItem(index)}
                        style={styles.deleteButton}
                      >
                        <IconSymbol name="trash" size={20} color={Colors.light.error} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.itemDetails}>
                      <View style={styles.itemDetailRow}>
                        <ThemedText style={styles.itemLabel}>Quantity:</ThemedText>
                        <Input
                          value={String(item.quantity)}
                          onChangeText={(text) => {
                            const num = parseInt(text) || 1;
                            handleUpdateItem(index, 'quantity', num);
                          }}
                          keyboardType="numeric"
                          containerStyle={styles.quantityInput}
                        />
                      </View>

                      <View style={styles.itemDetailRow}>
                        <ThemedText style={styles.itemLabel}>Unit:</ThemedText>
                        <View style={styles.unitDropdown}>
                          <SearchableDropdown
                            options={units}
                            value={item.unit}
                            onChange={(val) => handleUpdateItem(index, 'unit', String(val || ''))}
                            placeholder="Select Unit"
                            allowClear
                          />
                        </View>
                      </View>

                      <View style={styles.itemDetailRow}>
                        <ThemedText style={styles.itemLabel}>Reason:</ThemedText>
                        <TextInput
                          style={[styles.itemTextArea, { color: Colors.light.text, borderColor: Colors.light.border }]}
                          placeholder="Purpose"
                          value={item.reason}
                          onChangeText={(text) => handleUpdateItem(index, 'reason', text)}
                          multiline
                          numberOfLines={2}
                          placeholderTextColor={Colors.light.textSecondary}
                        />
                      </View>

                      <View style={styles.itemDetailRow}>
                        <ThemedText style={styles.itemLabel}>Notes:</ThemedText>
                        <TextInput
                          style={[styles.itemTextArea, { color: Colors.light.text, borderColor: Colors.light.border }]}
                          placeholder="Notes"
                          value={item.notes}
                          onChangeText={(text) => handleUpdateItem(index, 'notes', text)}
                          multiline
                          numberOfLines={2}
                          placeholderTextColor={Colors.light.textSecondary}
                        />
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </Card>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <Button
            title={loading ? 'Saving...' : 'Save Purchase Request'}
            variant="primary"
            onPress={handleSubmit}
            disabled={loading || items.length === 0}
            loading={loading}
            style={styles.submitButton}
          />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => router.back()}
            style={styles.cancelButton}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl + Spacing.lg, // Extra bottom padding to avoid buttons
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.sectionMarginBottom,
    paddingTop: Spacing.sm,
  },
  backButton: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.5,
  },
  card: {
    marginBottom: Layout.cardMarginBottom,
    padding: Layout.cardPadding,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },
  formGroup: {
    marginBottom: Layout.formGroupMarginBottom,
  },
  formGroupHalf: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.sm,
    color: Colors.light.text,
    letterSpacing: 0.1,
  },
  required: {
    color: Colors.light.error,
    fontWeight: Typography.weights.bold,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    minHeight: 80,
    textAlignVertical: 'top',
    borderColor: Colors.light.border,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  itemFormCard: {
    marginTop: Spacing.md,
    padding: Layout.cardPadding,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  productName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
    color: Colors.light.text,
  },
  productCode: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
    fontWeight: Typography.weights.normal,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  addButton: {
    flex: 1,
  },
  itemsList: {
    marginTop: Spacing.md,
  },
  itemsTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
    color: Colors.light.text,
  },
  itemCard: {
    marginBottom: Spacing.md,
    padding: Layout.cardPadding,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemCode: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
    fontWeight: Typography.weights.normal,
  },
  deleteButton: {
    padding: Spacing.sm,
  },
  itemDetails: {
    gap: Spacing.md,
  },
  itemDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  itemLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    width: 80,
    color: Colors.light.text,
  },
  quantityInput: {
    flex: 1,
  },
  unitDropdown: {
    flex: 1,
  },
  itemTextArea: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: Typography.sizes.base,
    minHeight: 60,
    textAlignVertical: 'top',
    borderColor: Colors.light.border,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  submitContainer: {
    marginTop: Layout.sectionMarginTop,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  submitButton: {
    marginBottom: 0,
  },
  cancelButton: {
    marginBottom: 0,
  },
});

