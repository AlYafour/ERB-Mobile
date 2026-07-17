import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { productsApi } from '@/lib/api/products';
import { projectsApi } from '@/lib/api/projects';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppSectionHeader } from '@/components/ui/AppScreen';
import { Input } from '@/components/ui/Input';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import DatePickerInput from '@/components/ui/DatePickerInput';
import AIProcurementChat, { AIFormUpdate } from '@/components/ui/AIProcurementChat';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Product, Project, PurchaseRequestItem } from '@/types';
import { AppPermissionGate } from '@/components/AppPermissionGate';

type AppColors = typeof Colors.light | typeof Colors.dark;

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

function SectionTitle({ children, colors }: { children: string; colors: AppColors }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 20,
        paddingHorizontal: 4,
      }}
    >
      {children}
    </Text>
  );
}

function FieldLabel({
  children,
  required,
  colors,
}: {
  children: string;
  required?: boolean;
  colors: AppColors;
}) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: 6,
      }}
    >
      {children}
      {required ? <Text style={{ color: colors.danger }}> *</Text> : ''}
    </Text>
  );
}

function NewPurchaseRequestScreenInner() {
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  const insets = useSafeAreaInsets();

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
  const [projectsError, setProjectsError] = useState(false);
  const [productsError, setProductsError] = useState(false);

  // Access control lives in the AppPermissionGate wrapper below — the old
  // inline check ran during the permissions fetch (hasPermission === false
  // while loading) and wrongly bounced authorized users opening this screen
  // cold from a deep link or notification.
  useEffect(() => {
    loadProjects();
    loadProducts();
  }, []);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      setProjectsError(false);
      const response = await projectsApi.getAll({ page: 1, page_size: 1000, is_active: true });
      setProjectsData(response);
    } catch { setProjectsError(true); }
    finally { setLoadingProjects(false); }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      setProductsError(false);
      const response = await productsApi.getAll({ page: 1, page_size: 1000 });
      setProductsData(response);
    } catch { setProductsError(true); }
    finally { setLoadingProducts(false); }
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
    new Set(productsData?.results?.map((p: Product) => p.category).filter((cat): cat is string => Boolean(cat)) || [])
  );

  const handleAddItem = () => {
    if (!selectedProduct) { toast('Please select a product first', 'warning'); return; }
    if (items.some((i) => i.product_id === Number(selectedProduct.id))) {
      toast(`${selectedProduct.name} is already added — edit its quantity below.`, 'warning');
      return;
    }
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

  const handleAIAddItems = (newItems: PurchaseRequestItemForm[]) => {
    setItems((prev) => {
      const merged = [...prev];
      for (const ni of newItems) {
        const existing = merged.findIndex((it) => it.product_id === ni.product_id);
        if (existing >= 0) {
          merged[existing] = { ...merged[existing], quantity: merged[existing].quantity + ni.quantity };
        } else {
          merged.push(ni);
        }
      }
      return merged;
    });
  };

  const handleAIFormUpdate = (fields: AIFormUpdate) => {
    if (fields.project_id) handleProjectChange(fields.project_id);
    setFormData((prev) => ({
      ...prev,
      ...(fields.title       ? { title: fields.title }            : {}),
      ...(fields.required_by ? { required_by: fields.required_by } : {}),
      ...(fields.notes       ? { notes: fields.notes }            : {}),
    }));
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
      if (result.id == null) {
        // Defense-in-depth: the backend create response is now guaranteed
        // to include 'id' (fixed server-side), but if it's ever missing again
        // (bad response, network shim, etc.) fall back to the list instead of
        // a broken "Not found" detail screen.
        router.replace('/purchase-requests' as any);
        return;
      }
      router.replace(`/purchase-requests/${result.id}` as any);
    } catch (error: any) {
      toast(error.message || 'Failed to create purchase request', 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
      <AppHeader title="New Purchase Request" showBack />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Request Details */}
          <AppSectionHeader title="Request Details" style={styles.sectionHeaderOverride} />
          <AppCard style={styles.card}>

            <FieldLabel required colors={c}>Project</FieldLabel>
            {projectsError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: c.danger, flex: 1 }}>Failed to load projects.</Text>
                <AppButton title="Retry" variant="outline" size="sm" onPress={loadProjects} />
              </View>
            ) : (
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
                placeholder={loadingProjects ? 'Loading projects...' : 'Select Project'}
                searchPlaceholder="Search projects..."
                allowClear
                disabled={loadingProjects}
              />
            )}

            <FieldLabel colors={c}>Project Code</FieldLabel>
            <Input
              placeholder="Auto-filled from project"
              value={formData.project_code}
              onChangeText={(t) => setFormData({ ...formData, project_code: t })}
            />

            <FieldLabel required colors={c}>Title</FieldLabel>
            <Input
              placeholder="Auto-filled from project name"
              value={formData.title}
              onChangeText={(t) => setFormData({ ...formData, title: t })}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <DatePickerInput
                  label="Request Date *"
                  value={formData.request_date}
                  onChange={(d) => setFormData({ ...formData, request_date: d })}
                  placeholder="Select date"
                />
              </View>
              <View style={{ flex: 1 }}>
                <DatePickerInput
                  label="Required By *"
                  value={formData.required_by}
                  onChange={(d) => setFormData({ ...formData, required_by: d })}
                  placeholder="Select date"
                  minimumDate={formData.request_date ? new Date(formData.request_date) : undefined}
                />
              </View>
            </View>

            <FieldLabel colors={c}>General Notes</FieldLabel>
            <TextInput
              style={{
                backgroundColor: c.surfaceSoft,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 15,
                color: c.textPrimary,
                minHeight: 72,
                marginBottom: 16,
              }}
              placeholder="Additional notes (optional)"
              placeholderTextColor={c.textMuted}
              value={formData.notes}
              onChangeText={(t) => setFormData({ ...formData, notes: t })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </AppCard>

          {/* AI Chat */}
          <AIProcurementChat onAddItems={handleAIAddItems} onFormUpdate={handleAIFormUpdate} />

          {/* Required Products */}
          <AppSectionHeader title="Required Products" style={styles.sectionHeaderOverride} />
          <AppCard style={styles.card}>

            {categories.length > 0 && (
              <>
                <FieldLabel colors={c}>Category Filter</FieldLabel>
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
              </>
            )}

            <FieldLabel colors={c}>Select Product</FieldLabel>
            {productsError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: c.danger, flex: 1 }}>Failed to load products.</Text>
                <AppButton title="Retry" variant="outline" size="sm" onPress={loadProducts} />
              </View>
            ) : (
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
                placeholder={loadingProducts ? 'Loading products...' : 'Search and select product...'}
                searchPlaceholder="Search products..."
                allowClear
                disabled={loadingProducts}
              />
            )}

            {/* Product detail form */}
            {selectedProduct && (
              <AppCard
                style={{
                  marginTop: 12,
                  backgroundColor: c.surfaceSoft,
                }}
              >
                <View style={styles.productHeader}>
                  <View style={[styles.productBadge, { backgroundColor: c.primarySoft }]}>
                    <IconSymbol name="cube.box.fill" size={14} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.productName, { color: c.textPrimary }]}>
                      {selectedProduct.name}
                    </Text>
                    {selectedProduct.code && (
                      <Text style={[styles.productCode, { color: c.textSecondary }]}>
                        Code: {selectedProduct.code}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <FieldLabel required colors={c}>Quantity</FieldLabel>
                    <Input
                      placeholder="1"
                      value={String(currentItem.quantity)}
                      onChangeText={(t) => setCurrentItem({ ...currentItem, quantity: parseInt(t) || 1 })}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldLabel colors={c}>Unit</FieldLabel>
                    <SearchableDropdown
                      options={units}
                      value={currentItem.unit}
                      onChange={(val) => setCurrentItem({ ...currentItem, unit: String(val || '') })}
                      placeholder="Select unit"
                      allowClear
                    />
                  </View>
                </View>

                <FieldLabel colors={c}>Reason / Purpose</FieldLabel>
                <TextInput
                  style={{
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: c.textPrimary,
                    minHeight: 60,
                    marginBottom: 16,
                  }}
                  placeholder="Why is this product needed?"
                  placeholderTextColor={c.textMuted}
                  value={currentItem.reason}
                  onChangeText={(t) => setCurrentItem({ ...currentItem, reason: t })}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />

                <FieldLabel colors={c}>Notes</FieldLabel>
                <TextInput
                  style={{
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: c.textPrimary,
                    minHeight: 60,
                    marginBottom: 16,
                  }}
                  placeholder="Additional notes"
                  placeholderTextColor={c.textMuted}
                  value={currentItem.notes}
                  onChangeText={(t) => setCurrentItem({ ...currentItem, notes: t })}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />

                <View style={styles.btnRow}>
                  <AppButton
                    title="Add Product"
                    variant="successOutline"
                    size="md"
                    onPress={handleAddItem}
                    style={{ flex: 1 }}
                  />
                  <AppButton
                    title="Cancel"
                    variant="ghost"
                    size="md"
                    onPress={() => setSelectedProduct(null)}
                    style={{ flex: 1 }}
                  />
                </View>
              </AppCard>
            )}

            {/* Added items list */}
            {items.length > 0 && (
              <View style={[styles.itemsList, { borderTopColor: c.divider }]}>
                <View style={styles.itemsHeader}>
                  <Text style={[styles.itemsTitle, { color: c.textPrimary }]}>Added Products</Text>
                  <View style={[styles.countBadge, { backgroundColor: c.primarySoft }]}>
                    <Text style={[styles.countText, { color: c.primary }]}>{items.length}</Text>
                  </View>
                </View>

                {items.map((item, index) => {
                  const product = item.product || productsData?.results.find(
                    (p: Product) => Number(p.id) === Number(item.product_id)
                  );
                  return (
                    <AppCard key={index} style={{ marginBottom: 8 }}>
                      <View style={styles.addedItemTop}>
                        <Text style={[styles.addedItemName, { color: c.textPrimary }]} numberOfLines={1}>
                          {product?.name || 'Unknown Product'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveItem(index)}
                          style={styles.removeBtn}
                          hitSlop={8}
                        >
                          <IconSymbol name="trash" size={16} color={c.danger} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.addedItemSub, { color: c.textSecondary }]}>
                        {item.quantity} {item.unit}{product?.code ? ` · ${product.code}` : ''}
                      </Text>
                      {item.reason ? (
                        <Text style={[styles.addedItemReason, { color: c.textMuted }]} numberOfLines={2}>
                          {item.reason}
                        </Text>
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
                          <Text style={[styles.miniLabel, { color: c.textSecondary }]}>Unit</Text>
                          <SearchableDropdown
                            options={units}
                            value={item.unit}
                            onChange={(val) => handleUpdateItem(index, 'unit', String(val || ''))}
                            placeholder="Unit"
                            allowClear
                          />
                        </View>
                      </View>
                    </AppCard>
                  );
                })}
              </View>
            )}
          </AppCard>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky submit bar */}
      <View
        style={[
          styles.submitBar,
          {
            borderTopColor: c.border,
            backgroundColor: c.surface,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <AppButton
          title={loading ? 'Saving...' : `Submit Request${items.length > 0 ? ` (${items.length} items)` : ''}`}
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleSubmit}
          disabled={loading || items.length === 0}
          loading={loading}
        />
        <AppButton
          title="Cancel"
          variant="secondary"
          size="md"
          fullWidth
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeaderOverride: {
    paddingHorizontal: 4,
  },
  card: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginBottom: 2,
  },
  productCode: {
    fontSize: 12,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  itemsList: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  addedItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  addedItemName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  removeBtn: {
    padding: 4,
  },
  addedItemSub: {
    fontSize: 12,
    marginBottom: 4,
  },
  addedItemReason: {
    fontSize: 12,
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
    marginBottom: 6,
  },
  submitBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
});

export default function NewPurchaseRequestScreen() {
  return (
    <AppPermissionGate category="purchase_request" action="create">
      <NewPurchaseRequestScreenInner />
    </AppPermissionGate>
  );
}
