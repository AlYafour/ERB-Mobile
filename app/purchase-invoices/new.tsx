import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseInvoicesApi } from '@/lib/api/purchase-invoices';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppSectionHeader } from '@/components/ui/AppScreen';
import { FormBottomBar } from '@/components/ui/FormBottomBar';
import { ParentRecordLoadingGate } from '@/components/ui/ParentRecordLoadingGate';
import { Input } from '@/components/ui/Input';
import DatePickerInput from '@/components/ui/DatePickerInput';
import { normalizeProductRef, computeInvoiceTotals, navigateAfterCreate } from '@/lib/utils/list-helpers';
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
  const [itemErrors, setItemErrors]   = useState<Record<number, { quantity?: string; unit_price?: string }>>({});
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    let live = true;
    purchaseOrdersApi.getById(poId).then((data: any) => {
      if (!live) return;
      setPo(data);
      setItems((data.items || []).map((it: any) => ({
        product_id:   normalizeProductRef(it)!,
        product_name: typeof it.product === 'object' ? it.product.name : it.product_name || 'Product',
        quantity:     String(it.quantity || 1),
        unit:         it.unit || '',
        unit_price:   it.unit_price ? String(it.unit_price) : '',
      })));
    }).catch((e: any) => { if (live) toast(e.message || 'Failed to load LPO', 'error'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [poId]);

  const updateItem = (i: number, field: keyof InvItem, value: string) => {
    const n = [...items];
    (n[i] as any)[field] = value;
    setItems(n);
  };

  const validate = () => {
    const e: Record<number, { quantity?: string; unit_price?: string }> = {};
    items.forEach((it, i) => {
      const rowErr: { quantity?: string; unit_price?: string } = {};
      if (!(Number(it.quantity) > 0)) rowErr.quantity = 'Quantity must be greater than 0';
      if (!it.unit_price || Number(it.unit_price) <= 0) rowErr.unit_price = 'Unit price is required';
      if (Object.keys(rowErr).length) e[i] = rowErr;
    });
    setItemErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!invoiceDate) { toast('Invoice date is required', 'error'); return; }
    if (!validate()) return;
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
      navigateAfterCreate(router, result as any, '/purchase-invoices', (id) => `/purchase-invoices/${id}`);
    } catch (err: any) {
      toast(err.message || 'Failed to create invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const S = makeStyles(C);

  if (loading) return <ParentRecordLoadingGate title="Create Invoice" loadingTitle="Loading LPO..." />;

  const poNum        = po?.order_number || `LPO-${poId}`;
  const supplierName = po?.supplier && typeof po.supplier === 'object' ? po.supplier.name : '';
  const { sub, tax, total } = computeInvoiceTotals(items, Number(taxRate));

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader title="Create Invoice" subtitle={poNum} showBack />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[S.content, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">

          {/* LPO Reference */}
          <AppSectionHeader title="Invoice Reference" style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
            <Text style={[S.refNum, { color: C.primary }]}>{poNum}</Text>
            {supplierName ? <Text style={[S.refSub, { color: C.textSecondary }]}>Supplier: {supplierName}</Text> : null}
            {grnId ? <Text style={[S.refSub, { color: C.textSecondary }]}>GRN-{grnId} attached</Text> : null}
          </AppCard>

          {/* Dates */}
          <AppSectionHeader title="Invoice Dates" style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
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
          <AppSectionHeader title={`Invoice Items (${items.length})`} style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
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
                    <Input
                      label="Qty *"
                      value={item.quantity}
                      onChangeText={(v) => updateItem(i, 'quantity', v)}
                      keyboardType="decimal-pad"
                      error={itemErrors[i]?.quantity}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Unit"
                      value={item.unit}
                      onChangeText={(v) => updateItem(i, 'unit', v)}
                      placeholder="pcs"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Input
                      label="Price (AED) *"
                      value={item.unit_price}
                      onChangeText={(v) => updateItem(i, 'unit_price', v)}
                      keyboardType="decimal-pad" placeholder="0.00"
                      error={itemErrors[i]?.unit_price}
                      containerStyle={{ marginBottom: 0 }}
                    />
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
          <AppSectionHeader title="Summary" style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
            <View style={S.summaryRow}>
              <Text style={[S.summaryLabel, { color: C.textSecondary }]}>Tax Rate (%)</Text>
              <View style={{ width: 100 }}>
                <Input
                  value={taxRate} onChangeText={setTaxRate}
                  keyboardType="decimal-pad" placeholder="5"
                  containerStyle={{ marginBottom: 0 }}
                />
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
          <AppSectionHeader title="Notes" style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
            <Input
              value={notes} onChangeText={setNotes}
              placeholder="Any invoice notes..."
              multiline numberOfLines={3}
            />
          </AppCard>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed bottom bar */}
      <FormBottomBar
        onCancel={() => router.back()}
        cancelDisabled={submitting}
        submitLabel={`Create Invoice — AED ${total.toFixed(2)}`}
        onSubmit={handleSubmit}
        loading={submitting}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    content:   { padding: 16 },
    card:      { marginBottom: 12 },
    sectionHeaderOverride: { paddingHorizontal: 4 },
    refNum:    { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    refSub:    { fontSize: 13, marginTop: 2 },

    twoCol:    { flexDirection: 'row', gap: 10 },
    threeCol:  { flexDirection: 'row', gap: 8 },

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
  });
}


export default function NewPurchaseInvoiceScreen() {
  return (
    <AppPermissionGate category="purchase_invoice" action="create">
      <NewPurchaseInvoiceScreenInner />
    </AppPermissionGate>
  );
}
