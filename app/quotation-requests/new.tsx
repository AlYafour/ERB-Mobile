import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { quotationRequestsApi } from '@/lib/api/quotation-requests';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { suppliersApi } from '@/lib/api/suppliers';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import SearchableDropdown, { DropdownOption } from '@/components/ui/SearchableDropdown';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';

type AppColors = typeof Colors.light | typeof Colors.dark;

function NewQuotationRequestScreenInner() {
  const { purchase_request_id } = useLocalSearchParams<{ purchase_request_id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const prId = Number(purchase_request_id);

  const [pr, setPr] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<DropdownOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{
    product_id: number;
    product_name: string;
    quantity: string;
    unit: string;
    notes: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      purchaseRequestsApi.getById(prId),
      suppliersApi.getAll({ page_size: 200 }),
    ]).then(([prData, suppData]) => {
      setPr(prData);
      setSuppliers((suppData.results || []).map((s: any) => ({
        value: s.id,
        label: s.name || s.business_name || `Supplier ${s.id}`,
      })));
      const prItems = (prData as any).items || [];
      setItems(prItems.map((item: any) => ({
        product_id:   typeof item.product === 'object' ? item.product.id : item.product,
        product_name: typeof item.product === 'object' ? item.product.name : item.product_name || 'Product',
        quantity:     String(item.quantity || 1),
        unit:         item.unit || '',
        notes:        '',
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
        items: items.map((it) => ({
          product_id: it.product_id,
          quantity:   Number(it.quantity) || 1,
          unit:       it.unit || undefined,
          notes:      it.notes.trim() || undefined,
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

  const S = makeStyles(C);

  if (loading) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Create Quotation Request" showBack />
      <View style={S.center}><AppEmptyState variant="loading" title="Loading purchase request..." /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader title="Create QR" subtitle={pr?.code || `PR-${prId}`} showBack />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[S.content, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* PR Info */}
          <AppCard style={S.card}>
            <Text style={[S.sectionTitle, { color: C.textPrimary }]}>Purchase Request</Text>
            <Text style={[S.prTitle, { color: C.textPrimary }]}>{pr?.title || `PR-${prId}`}</Text>
            {pr?.code ? <Text style={[S.prCode, { color: C.textSecondary }]}>{pr.code}</Text> : null}
          </AppCard>

          {/* Supplier */}
          <AppCard style={S.card}>
            <Text style={[S.sectionTitle, { color: C.textPrimary }]}>Supplier</Text>
            <Text style={[S.fieldLabel, { color: C.textMuted }]}>
              SELECT SUPPLIER <Text style={{ color: C.danger }}>*</Text>
            </Text>
            <SearchableDropdown
              options={suppliers}
              value={selectedSupplier}
              onChange={(v) => setSelectedSupplier(v ? Number(v) : null)}
              placeholder="Search and select supplier..."
              searchPlaceholder="Type supplier name..."
            />
          </AppCard>

          {/* Items */}
          <AppCard style={S.card}>
            <Text style={[S.sectionTitle, { color: C.textPrimary }]}>Items ({items.length})</Text>
            {items.map((item, i) => (
              <View key={i} style={[S.itemCard, { backgroundColor: C.surfaceSoft, borderColor: C.border },
                i < items.length - 1 && { marginBottom: 12 }]}>
                <View style={S.itemHeader}>
                  <View style={[S.itemBadge, { backgroundColor: C.primarySoft }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>{i + 1}</Text>
                  </View>
                  <Text style={[S.itemName, { color: C.textPrimary }]}>{item.product_name}</Text>
                </View>
                <View style={S.itemFields}>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.fieldLabel, { color: C.textMuted }]}>
                      QUANTITY <Text style={{ color: C.danger }}>*</Text>
                    </Text>
                    <TextInput
                      value={item.quantity}
                      onChangeText={(v) => { const n = [...items]; n[i].quantity = v; setItems(n); }}
                      placeholder="1"
                      placeholderTextColor={C.textMuted}
                      keyboardType="decimal-pad"
                      style={[S.input, { borderColor: C.border, color: C.textPrimary, backgroundColor: C.surface }]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.fieldLabel, { color: C.textMuted }]}>UNIT</Text>
                    <TextInput
                      value={item.unit}
                      onChangeText={(v) => { const n = [...items]; n[i].unit = v; setItems(n); }}
                      placeholder="pcs, m, kg..."
                      placeholderTextColor={C.textMuted}
                      style={[S.input, { borderColor: C.border, color: C.textPrimary, backgroundColor: C.surface }]}
                    />
                  </View>
                </View>
                <Text style={[S.fieldLabel, { color: C.textMuted }]}>NOTES</Text>
                <TextInput
                  value={item.notes}
                  onChangeText={(v) => { const n = [...items]; n[i].notes = v; setItems(n); }}
                  placeholder="Optional item notes..."
                  placeholderTextColor={C.textMuted}
                  multiline
                  style={[S.input, S.inputMulti,
                    { borderColor: C.border, color: C.textPrimary, backgroundColor: C.surface }]}
                />
              </View>
            ))}
          </AppCard>

          {/* Notes */}
          <AppCard style={S.card}>
            <Text style={[S.sectionTitle, { color: C.textPrimary }]}>Additional Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes for this quotation request..."
              placeholderTextColor={C.textMuted}
              multiline
              style={[S.input, S.inputMulti,
                { borderColor: C.border, color: C.textPrimary, backgroundColor: C.surface }]}
            />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed bottom bar */}
      <View style={[S.bottomBar, { borderTopColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <AppButton title="Cancel" variant="outline" size="md" onPress={() => router.back()}
          disabled={submitting} style={S.barBtn} />
        <AppButton title="Create Request" variant="primary" size="md"
          onPress={handleSubmit} loading={submitting} disabled={submitting} style={S.barBtnWide} />
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
    sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14, letterSpacing: -0.2 },
    prTitle:   { fontSize: 14, fontWeight: '600', marginBottom: 4 },
    prCode:    { fontSize: 12 },

    fieldLabel: {
      fontSize: 11, fontWeight: '600', marginBottom: 6, marginTop: 10,
      textTransform: 'uppercase', letterSpacing: 0.4,
    },
    input: {
      borderWidth: 1.5, borderRadius: 10, padding: 12,
      fontSize: 14, minHeight: 44,
    },
    inputMulti: { minHeight: 80, textAlignVertical: 'top' },

    itemCard:   { borderRadius: 10, padding: 12, borderWidth: 1 },
    itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    itemBadge:  { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    itemName:   { fontSize: 14, fontWeight: '600', flex: 1 },
    itemFields: { flexDirection: 'row', gap: 10 },

    bottomBar: {
      flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: C.surface,
    },
    barBtn:     { width: 90 },
    barBtnWide: { flex: 1 },
  });
}


export default function NewQuotationRequestScreen() {
  return (
    <AppPermissionGate category="quotation_request" action="create">
      <NewQuotationRequestScreenInner />
    </AppPermissionGate>
  );
}
