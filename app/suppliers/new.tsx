import { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { suppliersApi } from '@/lib/api/suppliers';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { Input } from '@/components/ui/Input';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AppColors = typeof Colors.light | typeof Colors.dark;

const CURRENCIES = [
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
];

const COUNTRIES = [
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'Egypt', label: 'Egypt' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Other', label: 'Other' },
];

export default function NewSupplierScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const S = makeStyles(C);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    business_name: '',
    supplier_number: '',
    first_name: '',
    last_name: '',
    contact_person: '',
    email: '',
    telephone: '',
    phone: '',
    mobile: '',
    street_address_1: '',
    street_address_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'United Arab Emirates',
    tax_id: '',
    trn: '',
    currency: 'AED',
    bank_name: '',
    bank_account: '',
    notes: '',
    is_active: true,
  });

  const set = (key: keyof typeof form) => (val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.business_name.trim() && !form.first_name.trim()) {
      e.business_name = 'Business name or first name is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      await suppliersApi.create(form);
      toast('Supplier created successfully', 'success');
      router.back();
    } catch (err: any) {
      toast(err.message || 'Failed to create supplier', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader title="New Supplier" showBack />

      <ScrollView contentContainerStyle={S.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Business Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Business Information</Text>
          <Input label="Business Name" value={form.business_name} onChangeText={set('business_name')}
            placeholder="Enter business name"
            error={errors.business_name} />
          <Input label="Supplier Number" value={form.supplier_number} onChangeText={set('supplier_number')}
            placeholder="Enter supplier number" />
          <Input label="TRN" value={form.trn} onChangeText={set('trn')} placeholder="Enter TRN" />
          <Input label="Tax ID" value={form.tax_id} onChangeText={set('tax_id')} placeholder="Enter tax ID" />
          <SearchableDropdown label="Currency" options={CURRENCIES} value={form.currency}
            onChange={(v) => set('currency')(v as string)} placeholder="Select currency" />
        </AppCard>

        {/* Contact Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Contact Information</Text>
          <Input label="First Name" value={form.first_name} onChangeText={set('first_name')}
            placeholder="Enter first name" />
          <Input label="Last Name" value={form.last_name} onChangeText={set('last_name')}
            placeholder="Enter last name" />
          <Input label="Contact Person" value={form.contact_person} onChangeText={set('contact_person')}
            placeholder="Enter contact person" />
          <Input label="Email" value={form.email} onChangeText={set('email')}
            placeholder="Enter email" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Telephone" value={form.telephone} onChangeText={set('telephone')}
            placeholder="Enter telephone" keyboardType="phone-pad" />
          <Input label="Phone" value={form.phone} onChangeText={set('phone')}
            placeholder="Enter phone" keyboardType="phone-pad" />
          <Input label="Mobile" value={form.mobile} onChangeText={set('mobile')}
            placeholder="Enter mobile" keyboardType="phone-pad" />
        </AppCard>

        {/* Address Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Address</Text>
          <Input label="Street Address 1" value={form.street_address_1} onChangeText={set('street_address_1')}
            placeholder="Enter street address" />
          <Input label="Street Address 2" value={form.street_address_2} onChangeText={set('street_address_2')}
            placeholder="Enter street address 2" />
          <Input label="City" value={form.city} onChangeText={set('city')} placeholder="Enter city" />
          <Input label="State" value={form.state} onChangeText={set('state')} placeholder="Enter state" />
          <Input label="Postal Code" value={form.postal_code} onChangeText={set('postal_code')}
            placeholder="Enter postal code" keyboardType="numeric" />
          <SearchableDropdown label="Country" options={COUNTRIES} value={form.country}
            onChange={(v) => set('country')(v as string)} placeholder="Select country" />
        </AppCard>

        {/* Bank Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Bank Information</Text>
          <Input label="Bank Name" value={form.bank_name} onChangeText={set('bank_name')}
            placeholder="Enter bank name" />
          <Input label="Bank Account" value={form.bank_account} onChangeText={set('bank_account')}
            placeholder="Enter bank account" />
        </AppCard>

        {/* Additional */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Additional</Text>
          <Input label="Notes" value={form.notes} onChangeText={set('notes')}
            placeholder="Enter notes" multiline numberOfLines={4} />
          <View style={S.switchRow}>
            <Text style={[S.switchLabel, { color: C.textPrimary }]}>Active</Text>
            <Switch value={form.is_active} onValueChange={set('is_active')}
              trackColor={{ true: C.primary, false: C.border }}
              thumbColor="#fff" />
          </View>
        </AppCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed bottom bar */}
      <View style={[S.bottomBar, { borderTopColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <AppButton title="Cancel" variant="outline" size="md" onPress={() => router.back()}
          disabled={saving} style={S.barBtn} />
        <AppButton title="Create Supplier" variant="primary" size="md" onPress={handleSubmit}
          loading={saving} disabled={saving} style={S.barBtn} />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
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
