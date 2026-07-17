import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseInvoicesApi } from '@/lib/api/purchase-invoices';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import DatePickerInput from '@/components/ui/DatePickerInput';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';

type AppColors = typeof Colors.light | typeof Colors.dark;

interface InvItem {
  product_id: number;
  product_name: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

function NewPurchaseInvoiceScreenInner() {
  const params = useLocalSearchParams<{ purchase_order_id?: string; goods_receiving_id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const poId  = Number(params.purchase_order_id);
  const grnId = params.goods_receiving_id ? Number(params.goods_receiving_id) : undefined;

  const [po, setPo]                 = useState<any>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate]         = useState('');
  const [taxRate, setTaxRate]         = useState('5');
  const [notes, setNotes]             = useState('');
  const [items, setItems]             = useState<InvItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    purchaseOrdersApi.getById(poId).then((data: any) => {
      setPo(data);
      setItems((data.items || []).map((it: any) => ({
        product_id:   typeof it.product === 'object' ? it.product.id : it.product,
        product_name: typeof it.product === 'object' ? it.product.name : it.product_name || 'Product',
        quantity:     String(it.quantity || 1),
        unit:         it.unit || '',
        unit_price:   it.unit_price ? String(it.unit_price) : '',
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
    const sub = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
    const tax = sub * ((Number(taxRate) || 0) / 100);
    return { sub, tax, total: sub + tax };
  };

  const handleSubmit = async () => {
    if (!invoiceDate) { toast('Invoice date is required', 'error'); return; }
    if (items.some((it) => !it.unit_price || Number(it.unit_price) <= 0)) {
      toast('All items need a unit price', 'error'); return;
    }
    try {
      setSubmitting(true);
      const result = await purchaseInvoicesApi.create({
        purchase_order_id: poId,
        grn_id:            grnId,
        invoice_date:      invoiceDate,
        due_date:          dueDate || undefined,
        tax_rate:          Number(taxRate) || 0,
        notes:             notes.trim() || undefined,
        status:            'pending',
        items: items.map((it) => ({
          product_id: it.product_id,
          quantity:   Number(it.quantity) || 1,
          unit:       it.unit || undefined,
          unit_price: Number(it.unit_price),
        })),
      });
      toast('Invoice created successfully', 'success');
      if (result.id == null) {
        // Defense-in-depth: the backend create response is now guaranteed
        // to include 'id' (fixed server-side), but if it's ever missing again
        // (bad response, network shim, etc.) fall back to the list instead of
        // a broken "Not found" detail screen.
        router.replace('/purchase-invoices' as any);
        return;
      }
      router.replace(`/purchase-invoices/${result.id}` as any);
    } catch (err: any) {
      toast(err.message || 'Failed to create invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const S = makeStyles(C);

  if (loading) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Create Invoice" showBack />
      <View style={S.center}><AppEmptyState variant="loading" title="Loading LPO..." /></View>
    </SafeAreaView>
  );

  const poNum        = po?.order_number || `LPO-${poId}`;
  const supplierName = po?.supplier && typeof po.supplier === 'object' ? po.supplier.name : '';
  const { sub, tax, total } = getTotal();

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader title="Create Invoice" subtitle={poNum} showBack />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[S.content, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">

          {/* LPO Reference */}
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Invoice Reference</Text>
            <Text style={[S.refNum, { color: C.primary }]}>{poNum}</Text>
            {supplierName ? <Text style={[S.refSub, { color: C.textSecondary }]}>Supplier: {supplierName}</Text> : null}
            {grnId ? <Text style={[S.refSub, { color: C.textSecondary }]}>GRN-{grnId} attached</Text> : null}
          </AppCard>

          {/* Dates */}
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Invoice Dates</Text>
            <View style={S.twoCol}>
              <View style={{ flex: 1 }}>
                <DatePickerInput label="Invoice Date *" value={invoiceDate}
                  onChange={setInvoiceDate} placeholder="Select date" />
              </View>
              <View style={{ flex: 1 }}>
                <DatePickerInput label="Due Date" value={dueDate}
                  onChange={setDueDate} placeholder="Select date"
                  minimumDate={invoiceDate ? new Date(invoiceDate) : undefined} />
              </View>
            </View>
          </AppCard>

          {/* Items */}
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Invoice Items ({items.length})</Text>
            {items.map((item, i) => (
              <View key={i} style={[S.itemCard, { backgroundColor: C.surfaceSoft, borderColor: C.border },
                i < items.length - 1 && { marginBottom: 12 }]}>
                <View style={S.itemHeader}>
                  <View style={[S.itemBadge, { backgroundColor: C.primarySoft }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>{i + 1}</Text>
                  </View>
                  <Text style={[S.itemName, { color: C.textPrimary }]}>{item.product_name}</Text>
                </View>
                <View style={S.threeCol}>
                  <View style={{ flex: 1.2 }}>
                    <Text style={[S.fieldLabel, { color: C.textMuted }]}>QTY *</Text>
                    <TextInput value={item.quantity}
                      onChangeText={(v) => updateItem(i, 'quantity', v)}
                      keyboardType="decimal-pad"
                      style={[S.input, { borderColor: C.border, color: C.textPrimary, backgroundColor: C.surface }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.fieldLabel, { color: C.textMuted }]}>UNIT</Text>
                    <TextInput value={item.unit}
                      onChangeText={(v) => updateItem(i, 'unit', v)}
                      placeholder="pcs" placeholderTextColor={C.textMuted}
                      style={[S.input, { borderColor: C.border, color: C.textPrimary, backgroundColor: C.surface }]} />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={[S.fieldLabel, { color: C.textMuted }]}>PRICE (AED) *</Text>
                    <TextInput value={item.unit_price}
                      onChangeText={(v) => updateItem(i, 'unit_price', v)}
                      keyboardType="decimal-pad" placeholder="0.00"
                      placeholderTextColor={C.textMuted}
                      style={[S.input, { borderColor: C.border, color: C.textPrimary, backgroundColor: C.surface }]} />
                  </View>
                </View>
                {item.quantity && item.unit_price ? (
                  <Text style={[S.lineTotal, { color: C.primary }]}>
                    Line: AED {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                  </Text>
                ) : null}
              </View>
            ))}
          </AppCard>

          {/* Tax & Summary */}
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Summary</Text>
            <View style={S.summaryRow}>
              <Text style={[S.summaryLabel, { color: C.textSecondary }]}>Tax Rate (%)</Text>
              <View style={{ width: 100 }}>
                <TextInput value={taxRate} onChangeText={setTaxRate}
                  keyboardType="decimal-pad" placeholder="5"
                  placeholderTextColor={C.textMuted}
                  style={[S.input, { borderColor: C.border, color: C.textPrimary, backgroundColor: C.surface }]} />
              </View>
            </View>
            <View style={[S.summaryRow, { marginTop: 8 }]}>
              <Text style={[S.summaryLabel, { color: C.textSecondary }]}>Subtotal</Text>
              <Text style={[S.summaryValue, { color: C.textPrimary }]}>AED {sub.toFixed(2)}</Text>
            </View>
            <View style={S.summaryRow}>
              <Text style={[S.summaryLabel, { color: C.textSecondary }]}>Tax ({taxRate || 0}%)</Text>
              <Text style={[S.summaryValue, { color: C.textPrimary }]}>AED {tax.toFixed(2)}</Text>
            </View>
            <View style={[S.summaryTotal, { borderTopColor: C.primary }]}>
              <Text style={[S.totalLabel, { color: C.textPrimary }]}>Invoice Total</Text>
              <Text style={[S.totalValue, { color: C.primary }]}>AED {total.toFixed(2)}</Text>
            </View>
          </AppCard>

          {/* Notes */}
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Notes</Text>
            <TextInput value={notes} onChangeText={setNotes}
              placeholder="Any invoice notes..." placeholderTextColor={C.textMuted}
              multiline
              style={[S.input, S.inputMulti, { borderColor: C.border, color: C.textPrimary, backgroundColor: C.surface }]} />
          </AppCard>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed bottom bar */}
      <View style={[S.bottomBar, { borderTopColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <AppButton title="Cancel" variant="outline" size="md" onPress={() => router.back()}
          disabled={submitting} style={S.barBtn} />
        <AppButton title={`Create Invoice — AED ${total.toFixed(2)}`}
          variant="primary" size="md" onPress={handleSubmit}
          loading={submitting} disabled={submitting} style={S.barBtnWide} />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content:   { padding: 16 },
    card:      { marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 14, letterSpacing: -0.2 },
    refNum:    { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    refSub:    { fontSize: 13, marginTop: 2 },

    twoCol:    { flexDirection: 'row', gap: 10 },
    threeCol:  { flexDirection: 'row', gap: 8 },

    fieldLabel:{ fontSize: 11, fontWeight: '600', marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
    input: {
      borderWidth: 1.5, borderRadius: 10, padding: 12,
      fontSize: 14, minHeight: 44,
    },
    inputMulti:{ minHeight: 80, textAlignVertical: 'top' },

    itemCard:  { borderRadius: 10, padding: 12, borderWidth: 1 },
    itemHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    itemBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    itemName:  { fontSize: 14, fontWeight: '600', flex: 1 },
    lineTotal: { fontSize: 12, fontWeight: '700', marginTop: 6, textAlign: 'right' },

    summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    summaryLabel:{ fontSize: 13, fontWeight: '500' },
    summaryValue:{ fontSize: 13, fontWeight: '600' },
    summaryTotal:{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, paddingTop: 10, marginTop: 4 },
    totalLabel:  { fontSize: 15, fontWeight: '700' },
    totalValue:  { fontSize: 16, fontWeight: '800' },

    bottomBar: {
      flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: C.surface,
    },
    barBtn:     { width: 90 },
    barBtnWide: { flex: 1 },
  });
}


export default function NewPurchaseInvoiceScreen() {
  return (
    <AppPermissionGate category="purchase_invoice" action="create">
      <NewPurchaseInvoiceScreenInner />
    </AppPermissionGate>
  );
}
