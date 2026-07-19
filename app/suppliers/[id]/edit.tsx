import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { suppliersApi } from '@/lib/api/suppliers';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppSkeletonList } from '@/components/ui/AppSkeleton';
import { Input } from '@/components/ui/Input';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { FormBottomBar } from '@/components/ui/FormBottomBar';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useEditForm } from '@/lib/hooks/use-edit-form';
import { baseDetailStyles } from '@/lib/utils/detail-styles';

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

interface SupplierEditForm {
  business_name: string;
  supplier_number: string;
  first_name: string;
  last_name: string;
  contact_person: string;
  email: string;
  telephone: string;
  phone: string;
  mobile: string;
  street_address_1: string;
  street_address_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  tax_id: string;
  trn: string;
  currency: string;
  bank_name: string;
  bank_account: string;
  notes: string;
  is_active: boolean;
}

function EditSupplierScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const S = makeStyles(C);

  const { loading, saving, errors, form, set, handleSubmit } = useEditForm<SupplierEditForm>({
    id,
    load: async () => {
      const s = await suppliersApi.getById(id) as any;
      return {
        business_name:    s.business_name || s.name || '',
        supplier_number:  s.supplier_number || '',
        first_name:       s.first_name || '',
        last_name:        s.last_name || '',
        contact_person:   s.contact_person || '',
        email:            s.email || '',
        telephone:        s.telephone || '',
        phone:            s.phone || '',
        mobile:           s.mobile || '',
        street_address_1: s.street_address_1 || s.address || '',
        street_address_2: s.street_address_2 || '',
        city:             s.city || '',
        state:            s.state || '',
        postal_code:      s.postal_code || '',
        country:          s.country || 'United Arab Emirates',
        tax_id:           s.tax_id || '',
        trn:              s.trn || '',
        currency:         s.currency || 'AED',
        bank_name:        s.bank_name || '',
        bank_account:     s.bank_account || '',
        notes:            s.notes || '',
        is_active:        s.is_active ?? true,
      };
    },
    validate: (f) => {
      const e: Record<string, string> = {};
      if (!f.business_name.trim() && !f.first_name.trim()) {
        e.business_name = 'Business name or first name is required';
      }
      return e;
    },
    submit: (f) => suppliersApi.update(id, f),
    loadErrorMessage: 'Failed to load supplier',
    successMessage: 'Supplier updated successfully',
    submitErrorMessage: 'Failed to update supplier',
  });

  if (loading || !form) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Edit Supplier" showBack />
      <AppSkeletonList count={3} lines={4} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader title="Edit Supplier" showBack />

      <ScrollView contentContainerStyle={S.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Business Information</Text>
          <Input label="Business Name" value={form.business_name} onChangeText={set('business_name')}
            placeholder="Enter business name" error={errors.business_name} />
          <Input label="Supplier Number" value={form.supplier_number} onChangeText={set('supplier_number')}
            placeholder="Enter supplier number" />
          <Input label="TRN" value={form.trn} onChangeText={set('trn')} placeholder="Enter TRN" />
          <Input label="Tax ID" value={form.tax_id} onChangeText={set('tax_id')} placeholder="Enter tax ID" />
          <SearchableDropdown label="Currency" options={CURRENCIES} value={form.currency}
            onChange={(v) => set('currency')(v as string)} placeholder="Select currency" />
        </AppCard>

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

        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Bank Information</Text>
          <Input label="Bank Name" value={form.bank_name} onChangeText={set('bank_name')}
            placeholder="Enter bank name" />
          <Input label="Bank Account" value={form.bank_account} onChangeText={set('bank_account')}
            placeholder="Enter bank account" />
        </AppCard>

        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Additional</Text>
          <Input label="Notes" value={form.notes} onChangeText={set('notes')}
            placeholder="Enter notes" multiline numberOfLines={4} />
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


export default function EditSupplierScreen() {
  return (
    <AppPermissionGate category="supplier" action="update">
      <EditSupplierScreenInner />
    </AppPermissionGate>
  );
}
