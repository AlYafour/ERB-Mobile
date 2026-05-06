import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goodsReceivingApi } from '@/lib/api/goods-receiving';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { toast } from '@/lib/hooks/use-toast';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/theme';

const C = Colors.light;

const QUALITY_OPTIONS = [
  { value: 'good', label: 'Good', color: C.success },
  { value: 'damaged', label: 'Damaged', color: C.warning },
  { value: 'defective', label: 'Defective', color: C.error },
  { value: 'missing', label: 'Missing', color: C.error },
];

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

interface GRNItem {
  purchase_order_item_id: number;
  product_id: number;
  product_name: string;
  ordered_quantity: number;
  received_quantity: string;
  rejected_quantity: string;
  quality_status: 'good' | 'damaged' | 'defective' | 'missing';
  notes: string;
}

export default function NewGoodsReceivingScreen() {
  const { purchase_order_id } = useLocalSearchParams<{ purchase_order_id: string }>();
  const router = useRouter();
  const poId = Number(purchase_order_id);

  const [po, setPo] = useState<any>(null);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<GRNItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    purchaseOrdersApi.getById(poId).then((data: any) => {
      setPo(data);
      setItems((data.items || []).map((it: any) => ({
        purchase_order_item_id: it.id,
        product_id: typeof it.product === 'object' ? it.product.id : it.product,
        product_name: typeof it.product === 'object' ? it.product.name : it.product_name || 'Product',
        ordered_quantity: Number(it.quantity) || 0,
        received_quantity: String(it.quantity || 0),
        rejected_quantity: '0',
        quality_status: 'good' as const,
        notes: '',
      })));
    }).catch((e: any) => toast(e.message || 'Failed to load LPO', 'error'))
      .finally(() => setLoading(false));
  }, [poId]);

  const updateItem = (i: number, field: keyof GRNItem, value: any) => {
    const n = [...items];
    (n[i] as any)[field] = value;
    setItems(n);
  };

  const handleSubmit = async () => {
    if (!receiptDate) { toast('Receipt date is required', 'error'); return; }
    if (items.some(it => Number(it.received_quantity) < 0)) {
      toast('Received quantities cannot be negative', 'error'); return;
    }

    try {
      setSubmitting(true);
      const result = await goodsReceivingApi.create({
        purchase_order_id: poId,
        receipt_date: receiptDate,
        notes: notes.trim() || undefined,
        items: items.map(it => ({
          purchase_order_item_id: it.purchase_order_item_id,
          product_id: it.product_id,
          ordered_quantity: it.ordered_quantity,
          received_quantity: Number(it.received_quantity) || 0,
          rejected_quantity: Number(it.rejected_quantity) || 0,
          quality_status: it.quality_status,
          notes: it.notes.trim() || undefined,
        })),
      });
      toast('GRN created successfully', 'success');
      router.replace(`/goods-receiving/${result.id}` as any);
    } catch (e: any) {
      toast(e.message || 'Failed to create GRN', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Create GRN" showBack />
      <View style={S.center}><ActivityIndicator size="large" color={C.tint} /></View>
    </SafeAreaView>
  );

  const poNum = po?.order_number || `LPO-${poId}`;

  return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Create GRN" subtitle={poNum} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={S.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* LPO Info */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Purchase Order</Text>
            <Text style={S.poNum}>{poNum}</Text>
            {po?.supplier && typeof po.supplier === 'object' && (
              <Text style={S.poSub}>Supplier: {po.supplier.name}</Text>
            )}
          </Card>

          {/* Receipt Date */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Receipt Details</Text>
            <FieldLabel label="Receipt Date" required />
            <StyledInput value={receiptDate} onChangeText={setReceiptDate} placeholder="YYYY-MM-DD" />
            <FieldLabel label="Notes" />
            <StyledInput value={notes} onChangeText={setNotes} placeholder="Any delivery notes..." multiline />
          </Card>

          {/* Items */}
          <Card padding={14} style={S.card}>
            <Text style={S.sectionTitle}>Received Items ({items.length})</Text>
            {items.map((item, i) => (
              <View key={i} style={[S.itemCard, i < items.length - 1 && { marginBottom: 14 }]}>
                {/* Item header */}
                <View style={S.itemHeader}>
                  <View style={S.itemBadge}><Text style={{ fontSize: 11, fontWeight: '700', color: C.tint }}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.itemName}>{item.product_name}</Text>
                    <Text style={S.itemOrdered}>Ordered: {item.ordered_quantity}</Text>
                  </View>
                </View>

                {/* Qty fields */}
                <View style={S.twoCol}>
                  <View style={{ flex: 1 }}>
                    <FieldLabel label="Received Qty" required />
                    <StyledInput
                      value={item.received_quantity}
                      onChangeText={(v: string) => updateItem(i, 'received_quantity', v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldLabel label="Rejected Qty" />
                    <StyledInput
                      value={item.rejected_quantity}
                      onChangeText={(v: string) => updateItem(i, 'rejected_quantity', v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                  </View>
                </View>

                {/* Quality status */}
                <FieldLabel label="Quality Status" required />
                <View style={S.qualityRow}>
                  {QUALITY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => updateItem(i, 'quality_status', opt.value)}
                      style={[S.qualityChip, item.quality_status === opt.value && { backgroundColor: opt.color, borderColor: opt.color }]}>
                      <Text style={[S.qualityText, item.quality_status === opt.value && { color: '#FFF' }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <FieldLabel label="Notes" />
                <StyledInput
                  value={item.notes}
                  onChangeText={(v: string) => updateItem(i, 'notes', v)}
                  placeholder="Item condition notes..."
                  multiline
                />
              </View>
            ))}
          </Card>

          <Button
            title={submitting ? 'Creating...' : `Create GRN — ${items.reduce((sum, it) => sum + (Number(it.received_quantity) || 0), 0)} items received`}
            variant="primary" onPress={handleSubmit} disabled={submitting} loading={submitting} style={{ marginTop: 8 }}
          />
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
  poNum: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  poSub: { fontSize: 13, color: C.textSecondary },
  label: { fontSize: 11, fontWeight: '600', color: C.textSecondary, marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, color: C.text, backgroundColor: '#FFFFFF', minHeight: 44 },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 10 },
  itemCard: { backgroundColor: C.backgroundSecondary, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.borderLight },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  itemBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.tintSubtle, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  itemName: { fontSize: 14, fontWeight: '600', color: C.text },
  itemOrdered: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  qualityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qualityChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#FFF' },
  qualityText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
});
