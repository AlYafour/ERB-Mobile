import { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { productsApi } from '@/lib/api/products';
import { suppliersApi } from '@/lib/api/suppliers';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppSkeletonList } from '@/components/ui/AppSkeleton';
import { Input } from '@/components/ui/Input';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { FormBottomBar } from '@/components/ui/FormBottomBar';
import { Supplier } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useEditForm } from '@/lib/hooks/use-edit-form';
import { baseDetailStyles } from '@/lib/utils/detail-styles';
import { UNITS } from '@/constants/units';

type AppColors = typeof Colors.light | typeof Colors.dark;

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed Amount' },
];

interface ProductEditForm {
  name: string;
  code: string;
  sku: string;
  barcode: string;
  description: string;
  brand: string;
  category: string;
  unit: string;
  supplier: number | undefined;
  unit_price: string;
  buy_price: string;
  discount: string;
  discount_type: string;
  track_stock: boolean;
  stock_balance: string;
  min_stock_level: string;
  is_active: boolean;
}

function EditProductScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const S = makeStyles(C);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const { loading, saving, errors, form, set, handleSubmit } = useEditForm<ProductEditForm>({
    id,
    load: async () => {
      const [product, suppResp] = await Promise.all([
        productsApi.getById(id),
        suppliersApi.getAll({ page_size: 100 }),
      ]);
      setSuppliers(suppResp.results || []);
      const supplierId =
        typeof product.supplier === 'object' && product.supplier !== null ? Number(product.supplier.id)
        : typeof product.supplier === 'number' ? product.supplier
        : undefined;
      return {
        name:           product.name || '',
        code:           product.code || '',
        sku:            product.sku || '',
        barcode:        product.barcode || '',
        description:    product.description || '',
        brand:          product.brand || '',
        category:       product.category || '',
        unit:           product.unit || 'piece',
        supplier:       supplierId,
        unit_price:     product.unit_price != null ? String(product.unit_price) : '',
        buy_price:      product.buy_price != null ? String(product.buy_price) : '',
        discount:       product.discount != null ? String(product.discount) : '',
        discount_type:  product.discount_type || 'percentage',
        track_stock:    product.track_stock ?? false,
        stock_balance:  product.stock_balance != null ? String(product.stock_balance) : '',
        min_stock_level:product.min_stock_level != null ? String(product.min_stock_level) : '',
        is_active:      product.is_active ?? true,
      };
    },
    validate: (f) => {
      const e: Record<string, string> = {};
      if (!f.name.trim()) e.name = 'Product name is required';
      return e;
    },
    submit: (f) => productsApi.update(id, {
      ...f,
      unit_price: parseFloat(f.unit_price) || 0,
      buy_price: parseFloat(f.buy_price) || 0,
      discount: parseFloat(f.discount) || 0,
      stock_balance: parseInt(f.stock_balance) || 0,
      min_stock_level: parseInt(f.min_stock_level) || 0,
    }),
    loadErrorMessage: 'Failed to load product',
    successMessage: 'Product updated successfully',
    submitErrorMessage: 'Failed to update product',
  });

  const supplierOptions = suppliers.map((s) => ({
    value: Number(s.id),
    label: s.business_name || s.name || `Supplier ${s.id}`,
  }));

  if (loading || !form) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Edit Product" showBack />
      <AppSkeletonList count={3} lines={4} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader title="Edit Product" showBack />

      <ScrollView contentContainerStyle={S.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Basic Information</Text>
          <Input label="Product Name *" value={form.name} onChangeText={set('name')}
            placeholder="Enter product name" error={errors.name} />
          <Input label="Product Code" value={form.code} onChangeText={set('code')}
            placeholder="Enter product code" />
          <Input label="SKU" value={form.sku} onChangeText={set('sku')} placeholder="Enter SKU" />
          <Input label="Barcode" value={form.barcode} onChangeText={set('barcode')}
            placeholder="Enter barcode" />
          <Input label="Description" value={form.description} onChangeText={set('description')}
            placeholder="Enter description" multiline numberOfLines={3} />
          <Input label="Brand" value={form.brand} onChangeText={set('brand')} placeholder="Enter brand" />
          <Input label="Category" value={form.category} onChangeText={set('category')}
            placeholder="Enter category" />
          <SearchableDropdown label="Unit" options={[...UNITS]} value={form.unit}
            onChange={(v) => set('unit')(v as string)} placeholder="Select unit" />
          {supplierOptions.length > 0 ? (
            <SearchableDropdown label="Supplier" options={supplierOptions} value={form.supplier}
              onChange={(v) => set('supplier')(v as number | undefined)}
              placeholder="Select supplier" allowClear />
          ) : null}
        </AppCard>

        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Pricing (AED)</Text>
          <Input label="Unit Price" value={form.unit_price} onChangeText={set('unit_price')}
            placeholder="0.00" keyboardType="numeric" />
          <Input label="Buy Price" value={form.buy_price} onChangeText={set('buy_price')}
            placeholder="0.00" keyboardType="numeric" />
          <SearchableDropdown label="Discount Type" options={DISCOUNT_TYPES} value={form.discount_type}
            onChange={(v) => set('discount_type')(v as string)} placeholder="Select discount type" />
          <Input label="Discount" value={form.discount} onChangeText={set('discount')}
            placeholder="0" keyboardType="numeric" />
        </AppCard>

        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Stock</Text>
          <View style={S.switchRow}>
            <Text style={[S.switchLabel, { color: C.textPrimary }]}>Track Stock</Text>
            <Switch value={form.track_stock} onValueChange={set('track_stock')}
              trackColor={{ true: C.primary, false: C.border }} thumbColor="#fff" />
          </View>
          {form.track_stock ? (
            <>
              <Input label="Stock Balance" value={form.stock_balance} onChangeText={set('stock_balance')}
                placeholder="0" keyboardType="numeric" />
              <Input label="Min Stock Level" value={form.min_stock_level} onChangeText={set('min_stock_level')}
                placeholder="0" keyboardType="numeric" />
            </>
          ) : null}
        </AppCard>

        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Status</Text>
          <View style={S.switchRow}>
            <Text style={[S.switchLabel, { color: C.textPrimary }]}>Active</Text>
            <Switch value={form.is_active} onValueChange={set('is_active')}
              trackColor={{ true: C.primary, false: C.border }} thumbColor="#fff" />
          </View>
        </AppCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FormBottomBar
        onCancel={() => router.back()}
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
        loading={saving}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    ...baseDetailStyles(C),
    content: { padding: 16, paddingBottom: 8 },
    switchRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 10, marginTop: 4,
    },
    switchLabel: { fontSize: 14, fontWeight: '500' },
  });
}


export default function EditProductScreen() {
  return (
    <AppPermissionGate category="product" action="update">
      <EditProductScreenInner />
    </AppPermissionGate>
  );
}
