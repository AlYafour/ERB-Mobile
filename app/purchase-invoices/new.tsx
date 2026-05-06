import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseInvoicesApi } from '@/lib/api/purchase-invoices';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { toast } from '@/lib/hooks/use-toast';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/theme';

const C = Colors.light;

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <Text style={S.label}>{label}{required && <Text style={{ color: C.error }}> *</Text>}</Text>;
}

function StyledInput({ value, onChangeText, placeholder, multiline, keyboardType }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={C.textTertiary} multiline={multiline} keyboardType={keyboardType}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={[S.input, multiline && S.inputMulti, focused && { borderColor: C.tint }]}
    />
  );
}

interface InvItem {
  product_id: number;
  product_name: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

export default function NewPurchaseInvoiceScreen() {
  const params = useLocalSearchParams<{ purchase_order_id?: string; goods_receiving_id?: string }>();
  const router = useRouter();
  const poId = Number(params.purchase_order_id);
  const grnId = params.goods_receiving_id ? Number(params.goods_receiving_id) : undefined;

  const [po, setPo] = useState<any>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    purchaseOrdersApi.getById(poId).then((data: any) => {
      setPo(data);
      setItems((data.items || []).map((it: any) => ({
        product_id: typeof it.product === 'object' ? it.product.id : it.product,
        product_name: typeof it.product === 'object' ? it.product.name : it.product_name || 'Product',
        quantity: String(it.quantity || 1),
        unit: it.unit || '',
        unit_price: it.unit_price ? String(it.unit_price) : '',
      })));
    }).catch((e: any) => toast(e.message || 'Failed to load LPO', 'error'))
      .finally(() => setLoading(false));
  }, [poId]);

  const updateItem = (i: number, field: keyof InvItem, value: string) => {
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
    if (!invoiceDate) { toast('Invoice date is required', 'error'); return; }
    if (items.some(it => !it.unit_price || Number(it.unit_price) <= 0)) {
      toast('All items need a unit price', 'error'); return;
    }

    try {
      setSubmitting(true);
      const result = await purchaseInvoicesApi.create({
        purchase_order_id: poId,
        grn_id: grnId,
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        tax_rate: Number(taxRate) || 0,
        notes: notes.trim() || undefined,
        status: 'pending',
        items: items.map(it => ({
          product_id: it.product_id,
          quantity: Number(it.quantity) || 1,
          unit: it.unit || undefined,
          unit_price: Number(it.unit_price),
        })),
      });
      toast('Invoice created successfully', 'success');
      router.replace(`/purchase-invoices/${result.id}` as any);
    } catch (e: any) {
      toast(e.message || 'Failed to create invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Create Invoice" showBack />
      <View style={S.center}><ActivityIndicator size="large" color={C.tint} /></View>
    </SafeAreaView>
  );

  const poNum = po?.order_number || `LPO-${poId}`;
  const { sub, tax, total } = getTotal();
  const supplierName = po?.supplier && typeof po.supplier === 'object' ? po.supplier.name : '';

  return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Create Invoice" subtitle={poNum} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={S.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

          {/* LPO Reference */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Invoice Reference</Text>
            <Text style={S.refNum}>{poNum}</Text>
            {supplierName && <Text style={S.refSub}>Supplier: {supplierName}</Text>}
            {grnId && <Text style={S.refSub}>GRN-{grnId} attached</Text>}
          </Card>

          {/* Dates */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Invoice Dates</Text>
            <View style={S.twoCol}>
              <View style={{ flex: 1 }}>
                <FieldLabel label="Invoice Date" required />
                <StyledInput value={invoiceDate} onChangeText={setInvoiceDate} placeholder="YYYY-MM-DD" />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel label="Due Date" />
                <StyledInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
              </View>
            </View>
          </Card>

          {/* Items */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Invoice Items ({items.length})</Text>
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
                  <Text style={S.itemTotal}>Line: AED {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</Text>
                )}
              </View>
            ))}
          </Card>

          {/* Tax & Summary */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Summary</Text>
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Tax Rate (%)</Text>
              <View style={{ width: 100 }}><StyledInput value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" placeholder="5" /></View>
            </View>
            <View style={[S.summaryRow, { marginTop: 8 }]}><Text style={S.summaryLabel}>Subtotal</Text><Text style={S.summaryValue}>AED {sub.toFixed(2)}</Text></View>
            <View style={S.summaryRow}><Text style={S.summaryLabel}>Tax ({taxRate || 0}%)</Text><Text style={S.summaryValue}>AED {tax.toFixed(2)}</Text></View>
            <View style={[S.summaryRow, S.totalRow]}><Text style={S.totalLabel}>Invoice Total</Text><Text style={S.totalValue}>AED {total.toFixed(2)}</Text></View>
          </Card>

          {/* Notes */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Notes</Text>
            <StyledInput value={notes} onChangeText={setNotes} placeholder="Any invoice notes..." multiline />
          </Card>

          <Button title={submitting ? 'Creating...' : `Create Invoice — AED ${total.toFixed(2)}`} variant="primary" onPress={handleSubmit} disabled={submitting} loading={submitting} style={{ marginTop: 8 }} />
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
  refNum: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  refSub: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
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
