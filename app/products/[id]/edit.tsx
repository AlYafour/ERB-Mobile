import { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { productsApi } from '@/lib/api/products';
import { suppliersApi } from '@/lib/api/suppliers';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { Input } from '@/components/ui/Input';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { Supplier } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AppColors = typeof Colors.light | typeof Colors.dark;

const UNITS = [
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

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed Amount' },
];

export default function EditProductScreen() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const insets = useSafeAreaInsets();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const S = makeStyles(C);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    code: '',
    sku: '',
    barcode: '',
    description: '',
    brand: '',
    category: '',
    unit: 'piece',
    supplier: undefined as number | undefined,
    unit_price: '',
    buy_price: '',
    discount: '',
    discount_type: 'percentage',
    track_stock: false,
    stock_balance: '',
    min_stock_level: '',
    is_active: true,
  });

  useEffect(() => {
    Promise.all([
      productsApi.getById(id),
      suppliersApi.getAll({ page_size: 100 }),
    ]).then(([product, suppResp]) => {
      setSuppliers(suppResp.results || []);
      const p = product as any;
      const supplierId =
        typeof p.supplier === 'object' && p.supplier !== null ? Number(p.supplier.id)
        : typeof p.supplier === 'number' ? p.supplier
        : undefined;
      setForm({
        name:           p.name || '',
        code:           p.code || '',
        sku:            p.sku || '',
        barcode:        p.barcode || '',
        description:    p.description || '',
        brand:          p.brand || '',
        category:       p.category || '',
        unit:           p.unit || 'piece',
        supplier:       supplierId,
        unit_price:     p.unit_price != null ? String(p.unit_price) : '',
        buy_price:      p.buy_price != null ? String(p.buy_price) : '',
        discount:       p.discount != null ? String(p.discount) : '',
        discount_type:  p.discount_type || 'percentage',
        track_stock:    p.track_stock ?? false,
        stock_balance:  p.stock_balance != null ? String(p.stock_balance) : '',
        min_stock_level:p.min_stock_level != null ? String(p.min_stock_level) : '',
        is_active:      p.is_active ?? true,
      });
    }).catch((err: any) => {
      toast(err.message || 'Failed to load product', 'error');
      router.back();
    }).finally(() => setLoading(false));
  }, [id]);

  const set = (key: keyof typeof form) => (val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      await productsApi.update(id, {
        ...form,
        unit_price: parseFloat(form.unit_price) || 0,
        buy_price: parseFloat(form.buy_price) || 0,
        discount: parseFloat(form.discount) || 0,
        stock_balance: parseInt(form.stock_balance) || 0,
        min_stock_level: parseInt(form.min_stock_level) || 0,
      });
      toast('Product updated successfully', 'success');
      router.back();
    } catch (err: any) {
      toast(err.message || 'Failed to update product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const supplierOptions = suppliers.map((s) => ({
    value: Number(s.id),
    label: (s as any).business_name || s.name || `Supplier ${s.id}`,
  }));

  if (loading) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Edit Product" showBack />
      <View style={S.center}><AppEmptyState variant="loading" title="Loading product..." /></View>
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
          <SearchableDropdown label="Unit" options={UNITS} value={form.unit}
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

      <View style={[S.bottomBar, { borderTopColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <AppButton title="Cancel" variant="outline" size="md" onPress={() => router.back()}
          disabled={saving} style={S.barBtn} />
        <AppButton title="Save Changes" variant="primary" size="md" onPress={handleSubmit}
          loading={saving} disabled={saving} style={S.barBtn} />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content:   { padding: 16, paddingBottom: 8 },
    card:      { marginBottom: 12 },
    sectionTitle: {
      fontSize: 15, fontWeight: '700', color: C.textPrimary,
      marginBottom: 14, letterSpacing: -0.2,
    },
    switchRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 10, marginTop: 4,
    },
    switchLabel: { fontSize: 14, fontWeight: '500' },
    bottomBar: {
      flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: C.surface,
    },
    barBtn: { flex: 1 },
  });
}
