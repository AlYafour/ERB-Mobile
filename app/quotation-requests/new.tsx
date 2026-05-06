import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { quotationRequestsApi } from '@/lib/api/quotation-requests';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { suppliersApi } from '@/lib/api/suppliers';
import { toast } from '@/lib/hooks/use-toast';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import SearchableDropdown, { DropdownOption } from '@/components/ui/SearchableDropdown';
import { Colors } from '@/constants/theme';

const C = Colors.light;

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={S.label}>{label}{required && <Text style={{ color: C.error }}> *</Text>}</Text>
  );
}

function StyledInput({ value, onChangeText, placeholder, multiline, keyboardType }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textTertiary}
      multiline={multiline}
      keyboardType={keyboardType}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[S.input, multiline && S.inputMulti, focused && { borderColor: C.tint }]}
    />
  );
}

export default function NewQuotationRequestScreen() {
  const { purchase_request_id } = useLocalSearchParams<{ purchase_request_id: string }>();
  const router = useRouter();
  const prId = Number(purchase_request_id);

  const [pr, setPr] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<DropdownOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ product_id: number; product_name: string; quantity: string; unit: string; notes: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      purchaseRequestsApi.getById(prId),
      suppliersApi.getAll({ page_size: 200 }),
    ]).then(([prData, suppData]) => {
      setPr(prData);
      setSuppliers((suppData.results || []).map((s: any) => ({ value: s.id, label: s.name || s.business_name || `Supplier ${s.id}` })));
      const prItems = (prData as any).items || [];
      setItems(prItems.map((item: any) => ({
        product_id: typeof item.product === 'object' ? item.product.id : item.product,
        product_name: typeof item.product === 'object' ? item.product.name : item.product_name || 'Product',
        quantity: String(item.quantity || 1),
        unit: item.unit || '',
        notes: '',
      })));
    }).catch((e: any) => toast(e.message || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [prId]);

  const handleSubmit = async () => {
    if (!selectedSupplier) { toast('Please select a supplier', 'error'); return; }
    if (items.length === 0) { toast('No items to request', 'error'); return; }

    try {
      setSubmitting(true);
      const result = await quotationRequestsApi.create({
        purchase_request_id: prId,
        supplier_id: selectedSupplier,
        notes: notes.trim() || undefined,
        items: items.map(it => ({
          product_id: it.product_id,
          quantity: Number(it.quantity) || 1,
          unit: it.unit || undefined,
          notes: it.notes.trim() || undefined,
        })),
      });
      toast('Quotation Request created successfully', 'success');
      router.replace(`/quotation-requests/${result.id}` as any);
    } catch (e: any) {
      toast(e.message || 'Failed to create QR', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Create Quotation Request" showBack />
      <View style={S.center}><ActivityIndicator size="large" color={C.tint} /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Create QR" subtitle={pr?.code || `PR-${prId}`} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={S.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

          {/* PR Info */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Purchase Request</Text>
            <Text style={S.prTitle}>{pr?.title || `PR-${prId}`}</Text>
            <Text style={S.prCode}>{pr?.code}</Text>
          </Card>

          {/* Supplier */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Supplier</Text>
            <FieldLabel label="Select Supplier" required />
            <SearchableDropdown
              options={suppliers}
              value={selectedSupplier}
              onChange={(v) => setSelectedSupplier(v ? Number(v) : null)}
              placeholder="Search and select supplier..."
              searchPlaceholder="Type supplier name..."
            />
          </Card>

          {/* Items */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Items ({items.length})</Text>
            {items.map((item, i) => (
              <View key={i} style={[S.itemCard, i < items.length - 1 && { marginBottom: 12 }]}>
                <View style={S.itemHeader}>
                  <View style={[S.itemBadge, { backgroundColor: C.tintSubtle }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.tint }}>{i + 1}</Text>
                  </View>
                  <Text style={S.itemName}>{item.product_name}</Text>
                </View>
                <View style={S.itemFields}>
                  <View style={{ flex: 1 }}>
                    <FieldLabel label="Quantity" required />
                    <StyledInput
                      value={item.quantity}
                      onChangeText={(v: string) => { const n = [...items]; n[i].quantity = v; setItems(n); }}
                      placeholder="1"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldLabel label="Unit" />
                    <StyledInput
                      value={item.unit}
                      onChangeText={(v: string) => { const n = [...items]; n[i].unit = v; setItems(n); }}
                      placeholder="pcs, m, kg..."
                    />
                  </View>
                </View>
                <FieldLabel label="Notes" />
                <StyledInput
                  value={item.notes}
                  onChangeText={(v: string) => { const n = [...items]; n[i].notes = v; setItems(n); }}
                  placeholder="Optional item notes..."
                  multiline
                />
              </View>
            ))}
          </Card>

          {/* Notes */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Additional Notes</Text>
            <StyledInput value={notes} onChangeText={setNotes} placeholder="Add any notes for this quotation request..." multiline />
          </Card>

          {/* Submit */}
          <Button title={submitting ? 'Creating...' : 'Create Quotation Request'} variant="primary" onPress={handleSubmit} disabled={submitting} loading={submitting} style={{ marginTop: 8 }} />

          <View style={{ height: 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 24 },
  card: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
  prTitle: { fontSize: 14, color: C.text, fontWeight: '600', marginBottom: 4 },
  prCode: { fontSize: 12, color: C.textSecondary },
  label: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, color: C.text, backgroundColor: '#FFFFFF', minHeight: 44 },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  itemCard: { backgroundColor: C.backgroundSecondary, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.borderLight },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  itemBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1 },
  itemFields: { flexDirection: 'row', gap: 10 },
});
