import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goodsReceivingApi } from '@/lib/api/goods-receiving';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppSectionHeader } from '@/components/ui/AppScreen';
import { FormBottomBar } from '@/components/ui/FormBottomBar';
import { ParentRecordLoadingGate } from '@/components/ui/ParentRecordLoadingGate';
import { Input } from '@/components/ui/Input';
import DatePickerInput from '@/components/ui/DatePickerInput';
import { normalizeProductRef, navigateAfterCreate } from '@/lib/utils/list-helpers';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';

type AppColors = typeof Colors.light | typeof Colors.dark;

const QUALITY_OPTIONS = [
  { value: 'good',      label: 'Good' },
  { value: 'damaged',   label: 'Damaged' },
  { value: 'defective', label: 'Defective' },
  { value: 'missing',   label: 'Missing' },
] as const;

type QualityStatus = 'good' | 'damaged' | 'defective' | 'missing';

interface GRNItem {
  purchase_order_item_id: number;
  product_id: number;
  product_name: string;
  ordered_quantity: number;
  received_quantity: string;
  rejected_quantity: string;
  quality_status: QualityStatus;
  notes: string;
}

function NewGoodsReceivingScreenInner() {
  const { purchase_order_id } = useLocalSearchParams<{ purchase_order_id: string }>();
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const S = makeStyles(C);
  const poId = Number(purchase_order_id);

  const [po, setPo] = useState<any>(null);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<GRNItem[]>([]);
  const [qtyErrors, setQtyErrors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let live = true;
    purchaseOrdersApi.getById(poId).then((data: any) => {
      if (!live) return;
      setPo(data);
      setItems((data.items || []).map((it: any) => ({
        purchase_order_item_id: it.id,
        product_id:   normalizeProductRef(it)!,
        product_name: typeof it.product === 'object' ? it.product.name : it.product_name || 'Product',
        ordered_quantity:  Number(it.quantity) || 0,
        received_quantity: String(it.quantity || 0),
        rejected_quantity: '0',
        quality_status:    'good' as QualityStatus,
        notes: '',
      })));
    }).catch((e: any) => { if (live) toast(e.message || 'Failed to load LPO', 'error'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [poId]);

  const updateItem = (i: number, field: keyof GRNItem, value: any) => {
    const n = [...items]; (n[i] as any)[field] = value; setItems(n);
  };

  const validate = () => {
    const e: Record<number, string> = {};
    items.forEach((it, i) => {
      if (Number(it.received_quantity) < 0) e[i] = 'Cannot be negative';
    });
    setQtyErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!receiptDate) { toast('Receipt date is required', 'error'); return; }
    if (!validate()) return;
    if (items.every((it) => Number(it.received_quantity) === 0)) {
      toast('At least one item must have a received quantity greater than zero', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const result = await goodsReceivingApi.create({
        purchase_order_id: poId,
        receipt_date: receiptDate,
        notes: notes.trim() || undefined,
        items: items.map(it => ({
          purchase_order_item_id: it.purchase_order_item_id,
          product_id:        it.product_id,
          ordered_quantity:  it.ordered_quantity,
          received_quantity: Number(it.received_quantity) || 0,
          rejected_quantity: Number(it.rejected_quantity) || 0,
          quality_status:    it.quality_status,
          notes:             it.notes.trim() || undefined,
        })),
      });
      toast('GRN created successfully', 'success');
      navigateAfterCreate(router, result, '/goods-receiving', (id) => `/goods-receiving/${id}`);
    } catch (e: any) {
      toast(e.message || 'Failed to create GRN', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ParentRecordLoadingGate title="Create GRN" loadingTitle="Loading purchase order..." />;

  const poNum = po?.order_number || `LPO-${poId}`;
  const totalReceived = items.reduce((sum, it) => sum + (Number(it.received_quantity) || 0), 0);

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader title="Create GRN" subtitle={poNum} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[S.content, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* PO Info */}
          <AppSectionHeader title="Purchase Order" style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
            <Text style={[S.poNum, { color: C.textPrimary }]}>{poNum}</Text>
            {po?.supplier && typeof po.supplier === 'object' ? (
              <Text style={[S.poSub, { color: C.textSecondary }]}>Supplier: {po.supplier.name}</Text>
            ) : null}
          </AppCard>

          {/* Receipt Details */}
          <AppSectionHeader title="Receipt Details" style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
            <DatePickerInput
              label="Receipt Date *"
              value={receiptDate}
              onChange={setReceiptDate}
              placeholder="Select date"
              maximumDate={new Date()}
            />
            <Input
              label="Notes"
              value={notes} onChangeText={setNotes}
              placeholder="Any delivery notes..."
              multiline numberOfLines={3}
            />
          </AppCard>

          {/* Items */}
          <AppSectionHeader title={`Received Items (${items.length})`} style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
            {items.map((item, i) => (
              <View
                key={i}
                style={[S.itemCard, { backgroundColor: C.surfaceSoft, borderColor: C.border },
                  i < items.length - 1 && { marginBottom: 14 }]}
              >
                <View style={S.itemHeader}>
                  <View style={[S.itemBadge, { backgroundColor: C.primarySoft }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.itemName, { color: C.textPrimary }]}>{item.product_name}</Text>
                    <Text style={[S.itemOrdered, { color: C.textSecondary }]}>Ordered: {item.ordered_quantity}</Text>
                  </View>
                </View>

                <View style={S.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Received Qty *"
                      value={item.received_quantity}
                      onChangeText={(v) => updateItem(i, 'received_quantity', v)}
                      keyboardType="decimal-pad" placeholder="0"
                      error={qtyErrors[i]}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Rejected Qty"
                      value={item.rejected_quantity}
                      onChangeText={(v) => updateItem(i, 'rejected_quantity', v)}
                      keyboardType="decimal-pad" placeholder="0"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>

                <Text style={S.fieldLabel}>QUALITY STATUS <Text style={{ color: C.danger }}>*</Text></Text>
                <View style={S.qualityRow}>
                  {QUALITY_OPTIONS.map((opt) => {
                    const isActive = item.quality_status === opt.value;
                    const chipColor = opt.value === 'good' ? C.success
                      : opt.value === 'damaged' ? C.warning : C.danger;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => updateItem(i, 'quality_status', opt.value)}
                        style={[S.qualityChip, {
                          borderColor: isActive ? chipColor : C.border,
                          backgroundColor: isActive ? chipColor : C.surface,
                        }]}
                      >
                        <Text style={[S.qualityText, { color: isActive ? '#FFF' : C.textSecondary }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Input
                  label="Notes"
                  value={item.notes}
                  onChangeText={(v) => updateItem(i, 'notes', v)}
                  placeholder="Item condition notes..."
                  multiline numberOfLines={2}
                  containerStyle={{ marginTop: 10, marginBottom: 0 }}
                />
              </View>
            ))}
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed bottom bar */}
      <FormBottomBar
        onCancel={() => router.back()}
        cancelDisabled={submitting}
        submitLabel={`Create GRN — ${totalReceived} items received`}
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

    poNum: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    poSub: { fontSize: 13 },

    fieldLabel: {
      fontSize: 11, fontWeight: '600', color: C.textMuted,
      marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.4,
    },

    twoCol:     { flexDirection: 'row', gap: 10 },
    itemCard:   { borderRadius: 10, padding: 12, borderWidth: 1 },
    itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
    itemBadge:  { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    itemName:   { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    itemOrdered:{ fontSize: 12 },

    qualityRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    qualityChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
    qualityText: { fontSize: 12, fontWeight: '600' },
  });
}


export default function NewGoodsReceivingScreen() {
  return (
    <AppPermissionGate category="goods_receiving" action="create">
      <NewGoodsReceivingScreenInner />
    </AppPermissionGate>
  );
}
