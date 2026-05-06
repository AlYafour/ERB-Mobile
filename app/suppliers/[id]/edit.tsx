import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

const currencies = [
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
];

const countries = [
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'Egypt', label: 'Egypt' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Other', label: 'Other' },
];

export default function EditSupplierScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    loadSupplier();
  }, [id]);

  const loadSupplier = async () => {
    try {
      setLoading(true);
      const supplier = await suppliersApi.getById(id);
      setFormData({
        business_name: supplier.business_name || supplier.name || '',
        supplier_number: supplier.supplier_number || '',
        first_name: supplier.first_name || '',
        last_name: supplier.last_name || '',
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        telephone: supplier.telephone || '',
        phone: supplier.phone || '',
        mobile: supplier.mobile || '',
        street_address_1: supplier.street_address_1 || supplier.address || '',
        street_address_2: supplier.street_address_2 || '',
        city: supplier.city || '',
        state: supplier.state || '',
        postal_code: supplier.postal_code || '',
        country: supplier.country || 'United Arab Emirates',
        tax_id: supplier.tax_id || '',
        trn: supplier.trn || '',
        currency: supplier.currency || 'AED',
        bank_name: supplier.bank_name || '',
        bank_account: supplier.bank_account || '',
        notes: supplier.notes || '',
        is_active: supplier.is_active ?? true,
      });
    } catch (error: any) {
      toast(error.message || 'Failed to load supplier', 'error');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.business_name && !formData.first_name) {
      toast('Business name or first name is required', 'error');
      return;
    }

    try {
      setSaving(true);
      await suppliersApi.update(id, formData);
      toast('Supplier updated successfully', 'success');
      router.back();
    } catch (error: any) {
      toast(error.message || 'Failed to update supplier', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <ThemedText style={styles.loadingText}>Loading supplier...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color={Colors.light.tint} />
            <ThemedText style={styles.backButtonText}>Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title" style={styles.mainTitle}>
            Edit Supplier
          </ThemedText>
        </View>

        {/* Business Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Business Information
          </ThemedText>
          <Input
            label="Business Name"
            value={formData.business_name}
            onChangeText={(text) => setFormData({ ...formData, business_name: text })}
            placeholder="Enter business name"
          />
          <Input
            label="Supplier Number"
            value={formData.supplier_number}
            onChangeText={(text) => setFormData({ ...formData, supplier_number: text })}
            placeholder="Enter supplier number"
          />
          <Input
            label="TRN"
            value={formData.trn}
            onChangeText={(text) => setFormData({ ...formData, trn: text })}
            placeholder="Enter TRN"
          />
          <Input
            label="Tax ID"
            value={formData.tax_id}
            onChangeText={(text) => setFormData({ ...formData, tax_id: text })}
            placeholder="Enter tax ID"
          />
          <SearchableDropdown
            label="Currency"
            options={currencies}
            value={formData.currency}
            onChange={(value) => setFormData({ ...formData, currency: value as string })}
            placeholder="Select currency"
          />
        </Card>

        {/* Contact Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Contact Information
          </ThemedText>
          <Input
            label="First Name"
            value={formData.first_name}
            onChangeText={(text) => setFormData({ ...formData, first_name: text })}
            placeholder="Enter first name"
          />
          <Input
            label="Last Name"
            value={formData.last_name}
            onChangeText={(text) => setFormData({ ...formData, last_name: text })}
            placeholder="Enter last name"
          />
          <Input
            label="Contact Person"
            value={formData.contact_person}
            onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
            placeholder="Enter contact person"
          />
          <Input
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Telephone"
            value={formData.telephone}
            onChangeText={(text) => setFormData({ ...formData, telephone: text })}
            placeholder="Enter telephone"
            keyboardType="phone-pad"
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="Enter phone"
            keyboardType="phone-pad"
          />
          <Input
            label="Mobile"
            value={formData.mobile}
            onChangeText={(text) => setFormData({ ...formData, mobile: text })}
            placeholder="Enter mobile"
            keyboardType="phone-pad"
          />
        </Card>

        {/* Address Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Address Information
          </ThemedText>
          <Input
            label="Street Address 1"
            value={formData.street_address_1}
            onChangeText={(text) => setFormData({ ...formData, street_address_1: text })}
            placeholder="Enter street address"
          />
          <Input
            label="Street Address 2"
            value={formData.street_address_2}
            onChangeText={(text) => setFormData({ ...formData, street_address_2: text })}
            placeholder="Enter street address 2"
          />
          <Input
            label="City"
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
            placeholder="Enter city"
          />
          <Input
            label="State"
            value={formData.state}
            onChangeText={(text) => setFormData({ ...formData, state: text })}
            placeholder="Enter state"
          />
          <Input
            label="Postal Code"
            value={formData.postal_code}
            onChangeText={(text) => setFormData({ ...formData, postal_code: text })}
            placeholder="Enter postal code"
            keyboardType="numeric"
          />
          <SearchableDropdown
            label="Country"
            options={countries}
            value={formData.country}
            onChange={(value) => setFormData({ ...formData, country: value as string })}
            placeholder="Select country"
          />
        </Card>

        {/* Bank Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Bank Information
          </ThemedText>
          <Input
            label="Bank Name"
            value={formData.bank_name}
            onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
            placeholder="Enter bank name"
          />
          <Input
            label="Bank Account"
            value={formData.bank_account}
            onChangeText={(text) => setFormData({ ...formData, bank_account: text })}
            placeholder="Enter bank account"
          />
        </Card>

        {/* Additional Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Additional Information
          </ThemedText>
          <Input
            label="Notes"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Enter notes"
            multiline
            numberOfLines={4}
            style={styles.textArea}
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
            title={saving ? 'Saving...' : 'Save Changes'}
            onPress={handleSubmit}
            disabled={saving}
            loading={saving}
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
    minHeight: 100,
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

