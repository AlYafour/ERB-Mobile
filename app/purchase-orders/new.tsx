import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { purchaseQuotationsApi } from '@/lib/api/purchase-quotations';
import { suppliersApi } from '@/lib/api/suppliers';
import { toast } from '@/lib/hooks/use-toast';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import SearchableDropdown, { DropdownOption } from '@/components/ui/SearchableDropdown';
import { Colors } from '@/constants/theme';

const C = Colors.light;

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <Text style={S.label}>{label}{required && <Text style={{ color: C.error }}> *</Text>}</Text>;
}

function StyledInput({ value, onChangeText, placeholder, multiline, keyboardType }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={C.textTertiary} multiline={multiline} keyboardType={keyboardType}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={[S.input, multiline && S.inputMulti, focused && { borderColor: C.tint }]}
    />
  );
}

interface LPOItem {
  product_id: number;
  product_name: string;
  quantity: string;
  unit: string;
  unit_price: string;
  notes: string;
}

export default function NewPurchaseOrderScreen() {
  const params = useLocalSearchParams<{ purchase_request_id?: string; purchase_quotation_id?: string }>();
  const router = useRouter();
  const prId = params.purchase_request_id ? Number(params.purchase_request_id) : null;
  const pqId = params.purchase_quotation_id ? Number(params.purchase_quotation_id) : null;

  const [suppliers, setSuppliers] = useState<DropdownOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LPOItem[]>([]);
  const [sourceLabel, setSourceLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const tasks: Promise<any>[] = [suppliersApi.getAll({ page_size: 200 })];
    if (prId) tasks.push(purchaseRequestsApi.getById(prId));
    if (pqId) tasks.push(purchaseQuotationsApi.getById(pqId));

    Promise.all(tasks).then(([suppData, sourceData]) => {
      setSuppliers((suppData.results || []).map((s: any) => ({ value: s.id, label: s.name || s.business_name || `Supplier ${s.id}` })));

      if (sourceData) {
        const sd = sourceData as any;
        if (pqId) {
          // From quotation: pre-fill supplier + items with prices
          setSourceLabel(sd.quotation_number || `PQ-${pqId}`);
          if (typeof sd.supplier === 'object' && sd.supplier?.id) setSelectedSupplier(sd.supplier.id);
          if (sd.payment_terms) setPaymentTerms(sd.payment_terms);
          if (sd.delivery_terms) setDeliveryTerms(sd.delivery_terms);
          setItems((sd.items || []).map((it: any) => ({
            product_id: typeof it.product === 'object' ? it.product.id : it.product,
            product_name: typeof it.product === 'object' ? it.product.name : it.product_name || 'Product',
            quantity: String(it.quantity || 1),
            unit: it.unit || '',
            unit_price: it.unit_price ? String(it.unit_price) : '',
            notes: '',
          })));
        } else if (prId) {
          // From PR: pre-fill items without prices
          setSourceLabel(sd.code || `PR-${prId}`);
          setItems((sd.items || []).map((it: any) => ({
            product_id: typeof it.product === 'object' ? it.product.id : it.product,
            product_name: typeof it.product === 'object' ? it.product.name : it.product_name || 'Product',
            quantity: String(it.quantity || 1),
            unit: it.unit || '',
            unit_price: '',
            notes: '',
          })));
        }
      }
    }).catch((e: any) => toast(e.message || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [prId, pqId]);

  const updateItem = (i: number, field: keyof LPOItem, value: string) => {
    const n = [...items];
    (n[i] as any)[field] = value;
    setItems(n);
  };

  const getTotal = () => {
    const sub = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
    const tax = sub * ((Number(taxRate) || 0) / 100);
    return { sub, tax, total: sub + tax };
  };

  const handleSubmit = async () => {
    if (!selectedSupplier) { toast('Please select a supplier', 'error'); return; }
    if (!orderDate) { toast('Order date is required', 'error'); return; }
    if (items.length === 0) { toast('Add at least one item', 'error'); return; }
    if (items.some(it => !it.unit_price || Number(it.unit_price) <= 0)) {
      toast('All items must have a unit price', 'error'); return;
    }

    try {
      setSubmitting(true);
      const { sub, tax, total } = getTotal();
      const result = await purchaseOrdersApi.create({
        purchase_request_id: prId || undefined,
        purchase_quotation_id: pqId || undefined,
        supplier_id: selectedSupplier,
        order_date: orderDate,
        delivery_date: deliveryDate || undefined,
        payment_terms: paymentTerms || undefined,
        delivery_terms: deliveryTerms || undefined,
        notes: notes.trim() || undefined,
        tax_rate: Number(taxRate) || 0,
        items: items.map(it => ({
          product_id: it.product_id,
          quantity: Number(it.quantity) || 1,
          unit: it.unit || undefined,
          unit_price: Number(it.unit_price),
          notes: it.notes.trim() || undefined,
        })),
      });
      toast('LPO created successfully', 'success');
      router.replace(`/purchase-orders/${result.id}` as any);
    } catch (e: any) {
      toast(e.message || 'Failed to create LPO', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Create LPO" showBack />
      <View style={S.center}><ActivityIndicator size="large" color={C.tint} /></View>
    </SafeAreaView>
  );

  const { sub, tax, total } = getTotal();

  return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Create LPO" subtitle={sourceLabel} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={S.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Supplier */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Supplier & Dates</Text>
            <FieldLabel label="Supplier" required />
            <SearchableDropdown options={suppliers} value={selectedSupplier} onChange={(v) => setSelectedSupplier(v ? Number(v) : null)} placeholder="Select supplier..." />
            <View style={S.twoCol}>
              <View style={{ flex: 1 }}>
                <FieldLabel label="Order Date" required />
                <StyledInput value={orderDate} onChangeText={setOrderDate} placeholder="YYYY-MM-DD" />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel label="Delivery Date" />
                <StyledInput value={deliveryDate} onChangeText={setDeliveryDate} placeholder="YYYY-MM-DD" />
              </View>
            </View>
            <FieldLabel label="Payment Terms" />
            <StyledInput value={paymentTerms} onChangeText={setPaymentTerms} placeholder="e.g. Net 30, Cash on Delivery..." />
            <FieldLabel label="Delivery Terms" />
            <StyledInput value={deliveryTerms} onChangeText={setDeliveryTerms} placeholder="e.g. FOB, CIF..." />
          </Card>

          {/* Items */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Order Items ({items.length})</Text>
            {items.map((item, i) => (
              <View key={i} style={[S.itemCard, i < items.length - 1 && { marginBottom: 12 }]}>
                <View style={S.itemHeader}>
                  <View style={S.itemBadge}><Text style={{ fontSize: 11, fontWeight: '700', color: C.tint }}>{i + 1}</Text></View>
                  <Text style={S.itemName}>{item.product_name}</Text>
                </View>
                <View style={S.threeCol}>
                  <View style={{ flex: 1.2 }}>
                    <FieldLabel label="Qty" required />
                    <StyledInput value={item.quantity} onChangeText={(v: string) => updateItem(i, 'quantity', v)} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldLabel label="Unit" />
                    <StyledInput value={item.unit} onChangeText={(v: string) => updateItem(i, 'unit', v)} placeholder="pcs" />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <FieldLabel label="Unit Price (AED)" required />
                    <StyledInput value={item.unit_price} onChangeText={(v: string) => updateItem(i, 'unit_price', v)} keyboardType="decimal-pad" placeholder="0.00" />
                  </View>
                </View>
                {item.quantity && item.unit_price && (
                  <Text style={S.itemTotal}>Subtotal: AED {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</Text>
                )}
              </View>
            ))}
          </Card>

          {/* Tax & Total */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Summary</Text>
            <View style={S.summaryRow}><Text style={S.summaryLabel}>Tax Rate (%)</Text>
              <View style={{ width: 100 }}><StyledInput value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" placeholder="5" /></View>
            </View>
            <View style={[S.summaryRow, { marginTop: 8 }]}><Text style={S.summaryLabel}>Subtotal</Text><Text style={S.summaryValue}>AED {sub.toFixed(2)}</Text></View>
            <View style={S.summaryRow}><Text style={S.summaryLabel}>Tax ({taxRate || 0}%)</Text><Text style={S.summaryValue}>AED {tax.toFixed(2)}</Text></View>
            <View style={[S.summaryRow, S.totalRow]}><Text style={S.totalLabel}>Total</Text><Text style={S.totalValue}>AED {total.toFixed(2)}</Text></View>
          </Card>

          {/* Notes */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Notes</Text>
            <StyledInput value={notes} onChangeText={setNotes} placeholder="Any additional notes..." multiline />
          </Card>

          <Button title={submitting ? 'Creating...' : `Create LPO — AED ${total.toFixed(2)}`} variant="primary" onPress={handleSubmit} disabled={submitting} loading={submitting} style={{ marginTop: 8 }} />
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
  label: { fontSize: 11, fontWeight: '600', color: C.textSecondary, marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, color: C.text, backgroundColor: '#FFFFFF', minHeight: 44 },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 10 },
  threeCol: { flexDirection: 'row', gap: 8 },
  itemCard: { backgroundColor: C.backgroundSecondary, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.borderLight },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  itemBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.tintSubtle, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1 },
  itemTotal: { fontSize: 12, fontWeight: '700', color: C.tint, marginTop: 6, textAlign: 'right' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 13, color: C.text, fontWeight: '600' },
  totalRow: { borderTopWidth: 2, borderTopColor: C.tint, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: C.tint },
});
