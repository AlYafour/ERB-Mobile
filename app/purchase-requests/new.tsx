import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { productsApi } from '@/lib/api/products';
import { projectsApi } from '@/lib/api/projects';
import { toast } from '@/lib/hooks/use-toast';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Product, Project, PurchaseRequestItem } from '@/types';
import { usePermissions } from '@/lib/hooks/use-permissions';

const C = Colors.light;

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
    } catch { } finally { setLoadingProjects(false); }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await productsApi.getAll({ page: 1, page_size: 1000 });
      setProductsData(response);
    } catch { } finally { setLoadingProducts(false); }
  };

  const handleProjectChange = (projectId: number | null | undefined) => {
    if (projectId) {
      const p = projectsData?.results.find((p: Project) => Number(p.id) === Number(projectId));
      if (p) {
        setFormData({ ...formData, project_id: projectId, project_code: p.code || '', title: p.name || '' });
      }
    } else {
      setFormData({ ...formData, project_id: undefined, project_code: '', title: '' });
    }
  };

  const handleProductSelect = (product: Product | null) => {
    setSelectedProduct(product);
    if (product) setCurrentItem({ ...currentItem, unit: product.unit || '' });
  };

  const filteredProducts = productsData?.results?.filter((p: Product) =>
    !selectedCategory || p.category === selectedCategory
  ) || [];

  const categories = Array.from(
    new Set(productsData?.results?.map((p: Product) => p.category).filter((c): c is string => Boolean(c)) || [])
  );

  const handleAddItem = () => {
    if (!selectedProduct) { toast('Please select a product first', 'warning'); return; }
    if (currentItem.quantity <= 0 || !Number.isInteger(currentItem.quantity)) {
      toast('Please enter a valid whole number quantity', 'warning');
      return;
    }
    setItems([...items, {
      product_id: Number(selectedProduct.id),
      product: selectedProduct,
      quantity: Math.floor(currentItem.quantity),
      unit: currentItem.unit || selectedProduct.unit || '',
      project_site: currentItem.project_site || '',
      reason: currentItem.reason,
      notes: currentItem.notes,
    }]);
    setSelectedProduct(null);
    setCurrentItem({ quantity: 1, unit: '', project_site: '', reason: '', notes: '' });
    toast('Product added', 'success');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof PurchaseRequestItemForm, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async () => {
    if (items.length === 0) { toast('Please add at least one product', 'warning'); return; }
    if (!formData.title) { toast('Title is required', 'warning'); return; }
    if (!formData.request_date) { toast('Request date is required', 'warning'); return; }
    if (!formData.required_by) { toast('Required by date is required', 'warning'); return; }

    try {
      setLoading(true);
      const result = await purchaseRequestsApi.create({
        project_id: formData.project_id || null,
        title: formData.title,
        request_date: formData.request_date,
        required_by: formData.required_by,
        notes: formData.notes || '',
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit: item.unit,
          project_site: item.project_site || '',
          reason: item.reason,
          notes: item.notes,
        })),
      });
      toast('Purchase request created successfully', 'success');
      router.replace(`/purchase-requests/${result.id}` as any);
    } catch (error: any) {
      toast(error.message || 'Failed to create purchase request', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!canCreate) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="New Purchase Request" showBack />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>

        {/* ── Request Details ── */}
        <SectionTitle>Request Details</SectionTitle>
        <Card padding={16} style={styles.card}>

          <FieldLabel required>Project</FieldLabel>
          <SearchableDropdown
            options={
              projectsData?.results.map((p: Project) => ({
                value: p.id,
                label: `${p.name} (${p.code || ''})`,
                searchText: `${p.name} ${p.code || ''} ${p.location || ''}`,
              })) || []
            }
            value={formData.project_id}
            onChange={(val) => handleProjectChange(val ? Number(val) : undefined)}
            placeholder="Select Project"
            searchPlaceholder="Search projects..."
            allowClear
          />

          <FieldLabel>Project Code</FieldLabel>
          <Input
            placeholder="Auto-filled from project"
            value={formData.project_code}
            onChangeText={(t) => setFormData({ ...formData, project_code: t })}
          />

          <FieldLabel required>Title</FieldLabel>
          <Input
            placeholder="Auto-filled from project name"
            value={formData.title}
            onChangeText={(t) => setFormData({ ...formData, title: t })}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <FieldLabel required>Request Date</FieldLabel>
              <Input
                placeholder="YYYY-MM-DD"
                value={formData.request_date}
                onChangeText={(t) => setFormData({ ...formData, request_date: t })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel required>Required By</FieldLabel>
              <Input
                placeholder="YYYY-MM-DD"
                value={formData.required_by}
                onChangeText={(t) => setFormData({ ...formData, required_by: t })}
              />
            </View>
          </View>

          <FieldLabel>General Notes</FieldLabel>
          <TextInput
            style={styles.textArea}
            placeholder="Additional notes (optional)"
            placeholderTextColor={C.textTertiary}
            value={formData.notes}
            onChangeText={(t) => setFormData({ ...formData, notes: t })}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Card>

        {/* ── Products ── */}
        <SectionTitle>Required Products</SectionTitle>
        <Card padding={16} style={styles.card}>

          {categories.length > 0 && (
            <>
              <FieldLabel>Category Filter</FieldLabel>
              <SearchableDropdown
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.filter(Boolean).map((c) => ({ value: c, label: c })),
                ]}
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val ? String(val) : '')}
                placeholder="All Categories"
                allowClear
              />
            </>
          )}

          <FieldLabel>Select Product</FieldLabel>
          <SearchableDropdown
            options={filteredProducts.map((p: Product) => ({
              value: p.id,
              label: `${p.name} (${p.code || 'N/A'})`,
              searchText: `${p.name} ${p.code || ''} ${p.category || ''}`,
            }))}
            value={selectedProduct?.id}
            onChange={(val) => {
              const p = filteredProducts.find((p: Product) => p.id === val);
              handleProductSelect(p || null);
            }}
            placeholder="Search and select product..."
            searchPlaceholder="Search products..."
            allowClear
          />

          {/* Product detail form */}
          {selectedProduct && (
            <View style={styles.productForm}>
              <View style={styles.productHeader}>
                <View style={[styles.productBadge, { backgroundColor: C.tintSubtle }]}>
                  <IconSymbol name="cube.box.fill" size={14} color={C.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{selectedProduct.name}</Text>
                  {selectedProduct.code && (
                    <Text style={styles.productCode}>Code: {selectedProduct.code}</Text>
                  )}
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FieldLabel required>Quantity</FieldLabel>
                  <Input
                    placeholder="1"
                    value={String(currentItem.quantity)}
                    onChangeText={(t) => setCurrentItem({ ...currentItem, quantity: parseInt(t) || 1 })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Unit</FieldLabel>
                  <SearchableDropdown
                    options={units}
                    value={currentItem.unit}
                    onChange={(val) => setCurrentItem({ ...currentItem, unit: String(val || '') })}
                    placeholder="Select unit"
                    allowClear
                  />
                </View>
              </View>

              <FieldLabel>Reason / Purpose</FieldLabel>
              <TextInput
                style={styles.textArea}
                placeholder="Why is this product needed?"
                placeholderTextColor={C.textTertiary}
                value={currentItem.reason}
                onChangeText={(t) => setCurrentItem({ ...currentItem, reason: t })}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <FieldLabel>Notes</FieldLabel>
              <TextInput
                style={styles.textArea}
                placeholder="Additional notes"
                placeholderTextColor={C.textTertiary}
                value={currentItem.notes}
                onChangeText={(t) => setCurrentItem({ ...currentItem, notes: t })}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <View style={styles.btnRow}>
                <Button
                  title="Add Product"
                  variant="primary"
                  onPress={handleAddItem}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setSelectedProduct(null)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          {/* Added items list */}
          {items.length > 0 && (
            <View style={styles.itemsList}>
              <View style={styles.itemsHeader}>
                <Text style={styles.itemsTitle}>Added Products</Text>
                <View style={[styles.countBadge, { backgroundColor: C.tintSubtle }]}>
                  <Text style={[styles.countText, { color: C.tint }]}>{items.length}</Text>
                </View>
              </View>

              {items.map((item, index) => {
                const product = item.product || productsData?.results.find(
                  (p: Product) => Number(p.id) === Number(item.product_id)
                );
                return (
                  <View key={index} style={styles.addedItem}>
                    <View style={styles.addedItemTop}>
                      <Text style={styles.addedItemName} numberOfLines={1}>
                        {product?.name || 'Unknown Product'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveItem(index)}
                        style={styles.removeBtn}
                        hitSlop={8}>
                        <IconSymbol name="trash" size={16} color={C.error} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.addedItemSub}>
                      {item.quantity} {item.unit}{product?.code ? ` · ${product.code}` : ''}
                    </Text>
                    {item.reason ? (
                      <Text style={styles.addedItemReason} numberOfLines={2}>{item.reason}</Text>
                    ) : null}

                    <View style={styles.itemEditRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Input
                          label="Qty"
                          value={String(item.quantity)}
                          onChangeText={(t) => handleUpdateItem(index, 'quantity', parseInt(t) || 1)}
                          keyboardType="numeric"
                          containerStyle={{ marginBottom: 0 }}
                        />
                      </View>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.miniLabel}>Unit</Text>
                        <SearchableDropdown
                          options={units}
                          value={item.unit}
                          onChange={(val) => handleUpdateItem(index, 'unit', String(val || ''))}
                          placeholder="Unit"
                          allowClear
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* ── Submit ── */}
        <View style={styles.submitArea}>
          <Button
            title={loading ? 'Saving…' : `Submit Request${items.length > 0 ? ` (${items.length} items)` : ''}`}
            variant="primary"
            onPress={handleSubmit}
            disabled={loading || items.length === 0}
            loading={loading}
            fullWidth
          />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => router.back()}
            fullWidth
          />
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={sectionTitleStyle}>{children}</Text>
  );
}

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text style={labelStyle}>
      {children}{required ? <Text style={{ color: C.error }}> *</Text> : ''}
    </Text>
  );
}

const sectionTitleStyle = {
  fontSize: 13,
  fontWeight: '700' as const,
  color: C.textSecondary,
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  marginBottom: 8,
  marginTop: 20,
  paddingHorizontal: 4,
};

const labelStyle = {
  fontSize: 13,
  fontWeight: '500' as const,
  color: C.textSecondary,
  marginBottom: 6,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textArea: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
    minHeight: 72,
    marginBottom: 16,
  },
  productForm: {
    marginTop: 12,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  productBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 2,
  },
  productCode: {
    fontSize: 12,
    color: C.textSecondary,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  itemsList: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    paddingTop: 16,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  countBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addedItem: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderLight,
    padding: 12,
    marginBottom: 8,
  },
  addedItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  addedItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    flex: 1,
  },
  removeBtn: {
    padding: 4,
  },
  addedItemSub: {
    fontSize: 12,
    color: C.textSecondary,
    marginBottom: 4,
  },
  addedItemReason: {
    fontSize: 12,
    color: C.textTertiary,
    marginBottom: 8,
  },
  itemEditRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  miniLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textSecondary,
    marginBottom: 6,
  },
  submitArea: {
    gap: 10,
    marginTop: 24,
  },
});
