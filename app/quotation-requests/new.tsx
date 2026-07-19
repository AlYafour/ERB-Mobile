import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { quotationRequestsApi } from '@/lib/api/quotation-requests';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { suppliersApi } from '@/lib/api/suppliers';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppSectionHeader } from '@/components/ui/AppScreen';
import { FormBottomBar } from '@/components/ui/FormBottomBar';
import { ParentRecordLoadingGate } from '@/components/ui/ParentRecordLoadingGate';
import { Input } from '@/components/ui/Input';
import SearchableDropdown, { DropdownOption } from '@/components/ui/SearchableDropdown';
import { normalizeProductRef, navigateAfterCreate } from '@/lib/utils/list-helpers';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';

type AppColors = typeof Colors.light | typeof Colors.dark;

function NewQuotationRequestScreenInner() {
  const { purchase_request_id } = useLocalSearchParams<{ purchase_request_id: string }>();
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const prId = Number(purchase_request_id);

  const [pr, setPr] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<DropdownOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{
    product_id: number;
    product_name: string;
    quantity: string;
    unit: string;
    notes: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([
      purchaseRequestsApi.getById(prId),
      suppliersApi.getAllActive(),
    ]).then(([prData, suppData]) => {
      if (!live) return;
      setPr(prData);
      setSuppliers((suppData || []).map((s: any) => ({
        value: s.id,
        label: s.name || s.business_name || `Supplier ${s.id}`,
      })));
      const prItems = prData.items || [];
      setItems(prItems.map((item: any) => ({
        product_id:   normalizeProductRef(item)!,
        product_name: typeof item.product === 'object' ? item.product.name : item.product_name || 'Product',
        quantity:     String(item.quantity || 1),
        unit:         item.unit || '',
        notes:        '',
      })));
    }).catch((e: any) => { if (live) toast(e.message || 'Failed to load', 'error'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
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
      navigateAfterCreate(router, result as any, '/quotation-requests', (id) => `/quotation-requests/${id}`);
    } catch (e: any) {
      toast(e.message || 'Failed to create QR', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const S = makeStyles(C);

  if (loading) return <ParentRecordLoadingGate title="Create Quotation Request" loadingTitle="Loading purchase request..." />;

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
          <AppSectionHeader title="Purchase Request" style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
            <Text style={[S.prTitle, { color: C.textPrimary }]}>{pr?.title || `PR-${prId}`}</Text>
            {pr?.code ? <Text style={[S.prCode, { color: C.textSecondary }]}>{pr.code}</Text> : null}
          </AppCard>

          {/* Supplier */}
          <AppSectionHeader title="Supplier" style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
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
          <AppSectionHeader title={`Items (${items.length})`} style={S.sectionHeaderOverride} />
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
                <View style={S.itemFields}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Quantity *"
                      value={item.quantity}
                      onChangeText={(v) => { const n = [...items]; n[i].quantity = v; setItems(n); }}
                      placeholder="1"
                      keyboardType="decimal-pad"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Unit"
                      value={item.unit}
                      onChangeText={(v) => { const n = [...items]; n[i].unit = v; setItems(n); }}
                      placeholder="pcs, m, kg..."
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>
                <Input
                  label="Notes"
                  value={item.notes}
                  onChangeText={(v) => { const n = [...items]; n[i].notes = v; setItems(n); }}
                  placeholder="Optional item notes..."
                  multiline numberOfLines={2}
                  containerStyle={{ marginTop: 10, marginBottom: 0 }}
                />
              </View>
            ))}
          </AppCard>

          {/* Notes */}
          <AppSectionHeader title="Additional Notes" style={S.sectionHeaderOverride} />
          <AppCard style={S.card}>
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes for this quotation request..."
              multiline numberOfLines={3}
            />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed bottom bar */}
      <FormBottomBar
        onCancel={() => router.back()}
        cancelDisabled={submitting}
        submitLabel="Create Request"
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
    prTitle:   { fontSize: 14, fontWeight: '600', marginBottom: 4 },
    prCode:    { fontSize: 12 },

    fieldLabel: {
      fontSize: 11, fontWeight: '600', marginBottom: 6, marginTop: 10,
      textTransform: 'uppercase', letterSpacing: 0.4,
    },

    itemCard:   { borderRadius: 10, padding: 12, borderWidth: 1 },
    itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    itemBadge:  { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    itemName:   { fontSize: 14, fontWeight: '600', flex: 1 },
    itemFields: { flexDirection: 'row', gap: 10 },
  });
}


export default function NewQuotationRequestScreen() {
  return (
    <AppPermissionGate category="quotation_request" action="create">
      <NewQuotationRequestScreenInner />
    </AppPermissionGate>
  );
}
