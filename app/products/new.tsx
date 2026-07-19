import { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { productsApi } from '@/lib/api/products';
import { suppliersApi } from '@/lib/api/suppliers';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppSectionHeader } from '@/components/ui/AppScreen';
import { FormBottomBar } from '@/components/ui/FormBottomBar';
import { Input } from '@/components/ui/Input';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { Supplier } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { UNITS } from '@/constants/units';

type AppColors = typeof Colors.light | typeof Colors.dark;

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed Amount' },
];

function NewProductScreenInner() {
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const S = makeStyles(C);

  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersError, setSuppliersError] = useState(false);
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
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setSuppliersError(false);
      const list = await suppliersApi.getAllActive();
      setSuppliers(list);
    } catch {
      setSuppliersError(true);
    }
  };

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
      await productsApi.create({
        ...form,
        unit_price: parseFloat(form.unit_price) || 0,
        buy_price: parseFloat(form.buy_price) || 0,
        discount: parseFloat(form.discount) || 0,
        stock_balance: parseInt(form.stock_balance) || 0,
        min_stock_level: parseInt(form.min_stock_level) || 0,
      });
      toast('Product created successfully', 'success');
      router.back();
    } catch (err: any) {
      toast(err.message || 'Failed to create product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const supplierOptions = suppliers.map((s) => ({
    value: Number(s.id),
    label: s.business_name || s.name || `Supplier ${s.id}`,
  }));

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader title="New Product" showBack />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={S.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Basic Information */}
        <AppSectionHeader title="Basic Information" style={S.sectionHeaderOverride} />
        <AppCard style={S.card}>
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
          <SearchableDropdown label="Unit" options={UNITS as unknown as { value: string; label: string }[]} value={form.unit}
            onChange={(v) => set('unit')(v as string)} placeholder="Select unit" />
          {suppliersError ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: C.danger, flex: 1 }}>Failed to load suppliers.</Text>
              <AppButton title="Retry" variant="outline" size="sm" onPress={loadSuppliers} />
            </View>
          ) : supplierOptions.length > 0 ? (
            <SearchableDropdown label="Supplier" options={supplierOptions} value={form.supplier}
              onChange={(v) => set('supplier')(v as number | undefined)}
              placeholder="Select supplier" allowClear />
          ) : null}
        </AppCard>

        {/* Pricing */}
        <AppSectionHeader title="Pricing (AED)" style={S.sectionHeaderOverride} />
        <AppCard style={S.card}>
          <Input label="Unit Price" value={form.unit_price} onChangeText={set('unit_price')}
            placeholder="0.00" keyboardType="numeric" />
          <Input label="Buy Price" value={form.buy_price} onChangeText={set('buy_price')}
            placeholder="0.00" keyboardType="numeric" />
          <SearchableDropdown label="Discount Type" options={DISCOUNT_TYPES} value={form.discount_type}
            onChange={(v) => set('discount_type')(v as string)} placeholder="Select discount type" />
          <Input label="Discount" value={form.discount} onChangeText={set('discount')}
            placeholder="0" keyboardType="numeric" />
        </AppCard>

        {/* Stock */}
        <AppSectionHeader title="Stock" style={S.sectionHeaderOverride} />
        <AppCard style={S.card}>
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

        {/* Status */}
        <AppSectionHeader title="Status" style={S.sectionHeaderOverride} />
        <AppCard style={S.card}>
          <View style={S.switchRow}>
            <Text style={[S.switchLabel, { color: C.textPrimary }]}>Active</Text>
            <Switch value={form.is_active} onValueChange={set('is_active')}
              trackColor={{ true: C.primary, false: C.border }} thumbColor="#fff" />
          </View>
        </AppCard>

        <View style={{ height: 100 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      <FormBottomBar
        onCancel={() => router.back()}
        cancelDisabled={saving}
        submitLabel="Create Product"
        onSubmit={handleSubmit}
        loading={saving}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    content:   { padding: 16, paddingBottom: 8 },
    card:      { marginBottom: 12 },
    sectionHeaderOverride: { paddingHorizontal: 4 },
    switchRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 10, marginTop: 4,
    },
    switchLabel: { fontSize: 14, fontWeight: '500' },
  });
}


export default function NewProductScreen() {
  return (
    <AppPermissionGate category="product" action="create">
      <NewProductScreenInner />
    </AppPermissionGate>
  );
}
