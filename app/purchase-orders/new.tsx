import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { purchaseQuotationsApi } from '@/lib/api/purchase-quotations';
import { suppliersApi } from '@/lib/api/suppliers';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppSectionHeader } from '@/components/ui/AppScreen';
import { FormBottomBar } from '@/components/ui/FormBottomBar';
import { ParentRecordLoadingGate } from '@/components/ui/ParentRecordLoadingGate';
import { Input } from '@/components/ui/Input';
import SearchableDropdown, { DropdownOption } from '@/components/ui/SearchableDropdown';
import DatePickerInput from '@/components/ui/DatePickerInput';
import { normalizeProductRef, computeInvoiceTotals, navigateAfterCreate } from '@/lib/utils/list-helpers';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';

type AppColors = typeof Colors.light | typeof Colors.dark;

interface LPOItem {
  product_id: number;
  product_name: string;
  quantity: string;
  unit: string;
  unit_price: string;
  notes: string;
}

function NewPurchaseOrderScreenInner() {
  const params = useLocalSearchParams<{ purchase_request_id?: string; purchase_quotation_id?: string }>();
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const S = makeStyles(C);

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
  const [itemErrors, setItemErrors] = useState<Record<number, { quantity?: string; unit_price?: string }>>({});
  const [sourceLabel, setSourceLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let live = true;
    const tasks: Promise<any>[] = [suppliersApi.getAllActive()];
    if (prId) tasks.push(purchaseRequestsApi.getById(prId));
    if (pqId) tasks.push(purchaseQuotationsApi.getById(pqId));

    Promise.all(tasks).then(([suppData, sourceData]) => {
      if (!live) return;
      setSuppliers((suppData || []).map((s: any) => ({
        value: s.id, label: s.name || s.business_name || `Supplier ${s.id}`,
      })));
      if (sourceData) {
        const sd = sourceData;
        if (pqId) {
          setSourceLabel(sd.quotation_number || `PQ-${pqId}`);
          if (typeof sd.supplier === 'object' && sd.supplier?.id) setSelectedSupplier(sd.supplier.id);
          if (sd.payment_terms) setPaymentTerms(sd.payment_terms);
          if (sd.delivery_terms) setDeliveryTerms(sd.delivery_terms);
          setItems((sd.items || []).map((it: any) => ({
            product_id:   normalizeProductRef(it)!,
            product_name: typeof it.product === 'object' ? it.product.name : it.product_name || 'Product',
            quantity:     String(it.quantity || 1),
            unit:         it.unit || '',
            unit_price:   it.unit_price ? String(it.unit_price) : '',
            notes:        '',
          })));
        } else if (prId) {
          setSourceLabel(sd.code || `PR-${prId}`);
          setItems((sd.items || []).map((it: any) => ({
            product_id:   normalizeProductRef(it)!,
            product_name: typeof it.product === 'object' ? it.product.name : it.product_name || 'Product',
            quantity:     String(it.quantity || 1),
            unit:         it.unit || '',
            unit_price:   '',
            notes:        '',
          })));
        }
      }
    }).catch((e: any) => { if (live) toast(e.message || 'Failed to load', 'error'); })
      .finally(() => { if (live) setLoading(false); });

    return () => { live = false; };
  }, [prId, pqId]);

  const updateItem = (i: number, field: keyof LPOItem, value: string) => {
    const n = [...items]; (n[i] as any)[field] = value; setItems(n);
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
    if (!selectedSupplier) { toast('Please select a supplier', 'error'); return; }
    if (!orderDate) { toast('Order date is required', 'error'); return; }
    if (items.length === 0) { toast('Add at least one item', 'error'); return; }
    if (!validate()) return;
    try {
      setSubmitting(true);
      const result = await purchaseOrdersApi.create({
        purchase_request_id:   prId || undefined,
        purchase_quotation_id: pqId || undefined,
        supplier_id:    selectedSupplier,
        order_date:     orderDate,
        delivery_date:  deliveryDate || undefined,
        payment_terms:  paymentTerms || undefined,
        delivery_terms: deliveryTerms || undefined,
        notes:          notes.trim() || undefined,
        tax_rate:       Number(taxRate) || 0,
        items: items.map(it => ({
          product_id: it.product_id,
          quantity:   Number(it.quantity) || 1,
          unit:       it.unit || undefined,
          unit_price: Number(it.unit_price),
          notes:      it.notes.trim() || undefined,
        })),
      });
      toast('LPO created successfully', 'success');
      navigateAfterCreate(router, result as any, '/purchase-orders', (id) => `/purchase-orders/${id}`);
    } catch (e: any) {
      toast(e.message || 'Failed to create LPO', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ParentRecordLoadingGate title="Create LPO" loadingTitle="Loading data..." />;

  const { sub, tax, total } = computeInvoiceTotals(items, Number(taxRate));

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader title="Create LPO" subtitle={sourceLabel} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[S.content, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Supplier & Dates */}
          <AppSectionHeader title="Supplier & Dates" style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
            <Text style={S.fieldLabel}>SUPPLIER <Text style={{ color: C.danger }}>*</Text></Text>
            <SearchableDropdown
              options={suppliers}
              value={selectedSupplier}
              onChange={(v) => setSelectedSupplier(v ? Number(v) : null)}
              placeholder="Select supplier..."
            />

            <View style={S.twoCol}>
              <View style={{ flex: 1 }}>
                <DatePickerInput label="Order Date *" value={orderDate} onChange={setOrderDate} placeholder="Select date" />
              </View>
              <View style={{ flex: 1 }}>
                <DatePickerInput
                  label="Delivery Date" value={deliveryDate} onChange={setDeliveryDate}
                  placeholder="Select date"
                  minimumDate={orderDate ? new Date(orderDate) : undefined}
                />
              </View>
            </View>

            <Input
              label="Payment Terms"
              value={paymentTerms} onChangeText={setPaymentTerms}
              placeholder="e.g. Net 30, Cash on Delivery..."
            />
            <Input
              label="Delivery Terms"
              value={deliveryTerms} onChangeText={setDeliveryTerms}
              placeholder="e.g. FOB, CIF..."
            />
          </AppCard>

          {/* Items */}
          <AppSectionHeader title={`Order Items (${items.length})`} style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
            {items.map((item, i) => (
              <View
                key={i}
                style={[S.itemCard, { backgroundColor: C.surfaceSoft, borderColor: C.border },
                  i < items.length - 1 && { marginBottom: 12 }]}
              >
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
                      value={item.quantity} onChangeText={(v) => updateItem(i, 'quantity', v)}
                      keyboardType="decimal-pad"
                      error={itemErrors[i]?.quantity}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Unit"
                      value={item.unit} onChangeText={(v) => updateItem(i, 'unit', v)}
                      placeholder="pcs"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Input
                      label="Unit Price *"
                      value={item.unit_price} onChangeText={(v) => updateItem(i, 'unit_price', v)}
                      keyboardType="decimal-pad" placeholder="0.00"
                      error={itemErrors[i]?.unit_price}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>
                {item.quantity && item.unit_price ? (
                  <Text style={[S.itemSubtotal, { color: C.primary }]}>
                    Subtotal: AED {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                  </Text>
                ) : null}
              </View>
            ))}
          </AppCard>

          {/* Summary */}
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
            <View style={S.summaryRow}>
              <Text style={[S.summaryLabel, { color: C.textSecondary }]}>Subtotal</Text>
              <Text style={[S.summaryValue, { color: C.textPrimary }]}>AED {sub.toFixed(2)}</Text>
            </View>
            <View style={S.summaryRow}>
              <Text style={[S.summaryLabel, { color: C.textSecondary }]}>Tax ({taxRate || 0}%)</Text>
              <Text style={[S.summaryValue, { color: C.textPrimary }]}>AED {tax.toFixed(2)}</Text>
            </View>
            <View style={[S.summaryRow, S.totalRow, { borderTopColor: C.primary }]}>
              <Text style={[S.totalLabel, { color: C.textPrimary }]}>Total</Text>
              <Text style={[S.totalValue, { color: C.primary }]}>AED {total.toFixed(2)}</Text>
            </View>
          </AppCard>

          {/* Notes */}
          <AppSectionHeader title="Notes" style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
            <Input
              value={notes} onChangeText={setNotes}
              placeholder="Any additional notes..."
              multiline numberOfLines={3}
            />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed bottom bar */}
      <FormBottomBar
        onCancel={() => router.back()}
        cancelDisabled={submitting}
        submitLabel={`Create LPO — AED ${total.toFixed(2)}`}
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

    fieldLabel: {
      fontSize: 11, fontWeight: '600', color: C.textMuted,
      marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.4,
    },

    twoCol:   { flexDirection: 'row', gap: 10 },
    threeCol: { flexDirection: 'row', gap: 8 },

    itemCard:     { borderRadius: 10, padding: 12, borderWidth: 1 },
    itemHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    itemBadge:    { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    itemName:     { fontSize: 14, fontWeight: '600', flex: 1 },
    itemSubtotal: { fontSize: 12, fontWeight: '700', marginTop: 6, textAlign: 'right' },

    summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    summaryLabel: { fontSize: 13, fontWeight: '500' },
    summaryValue: { fontSize: 13, fontWeight: '600' },
    totalRow:     { borderTopWidth: 2, paddingTop: 10, marginTop: 4 },
    totalLabel:   { fontSize: 15, fontWeight: '700' },
    totalValue:   { fontSize: 16, fontWeight: '800' },
  });
}


export default function NewPurchaseOrderScreen() {
  return (
    <AppPermissionGate category="purchase_order" action="create">
      <NewPurchaseOrderScreenInner />
    </AppPermissionGate>
  );
}
