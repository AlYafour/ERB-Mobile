import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { suppliersApi } from '@/lib/api/suppliers';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard, AppCardRow } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { Supplier } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';

type AppColors = typeof Colors.light | typeof Colors.dark;

function SupplierDetailScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isSuperuser = user?.is_superuser ?? false;
  const canUpdate = isSuperuser || (hasPermission('supplier', 'update') ?? false);

  const load = async () => {
    try {
      setLoading(true);
      setSupplier(await suppliersApi.getById(id));
    } catch (err: any) {
      toast(err.message || 'Failed to load supplier', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  // Stale-detail fix: refetch when the screen regains focus (a child
  // flow - create QR/PO/GRN/invoice, approve, edit - can change this
  // document's state while this screen stays mounted underneath).
  useRefetchOnFocus(load);

  const S = makeStyles(C);

  if (loading) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Supplier" showBack />
      <View style={S.center}><AppEmptyState variant="loading" title="Loading supplier..." /></View>
    </SafeAreaView>
  );

  if (!supplier) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Supplier" showBack />
      <View style={S.center}><AppEmptyState variant="empty" title="Supplier not found" /></View>
    </SafeAreaView>
  );

  const s = supplier as any;
  const displayName = s.business_name || supplier.name || 'Unnamed Supplier';
  const isActive    = s.is_active;

  return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader
        title={displayName}
        subtitle={s.supplier_number || undefined}
        showBack
        right={isActive !== undefined ? (
          <AppBadge variant={isActive ? 'success' : 'danger'}>
            {isActive ? 'Active' : 'Inactive'}
          </AppBadge>
        ) : undefined}
      />

      <ScrollView
        contentContainerStyle={S.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.primary} colors={[C.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Business Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Business Information</Text>
          <AppCardRow label="Business Name"   value={s.business_name} />
          <AppCardRow label="Name"            value={supplier.name !== s.business_name ? supplier.name : null} />
          <AppCardRow label="Supplier No."    value={s.supplier_number} />
          <AppCardRow label="Category"        value={s.category || s.supplier_type} />
          <AppCardRow label="TRN"             value={s.trn} />
          <AppCardRow label="Tax ID"          value={s.tax_id} />
          <AppCardRow label="Currency"        value={s.currency} last />
        </AppCard>

        {/* Contact Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Contact Information</Text>
          <AppCardRow label="Contact Person"  value={supplier.contact_person} />
          {(s.first_name || s.last_name) ? (
            <AppCardRow label="Full Name" value={[s.first_name, s.last_name].filter(Boolean).join(' ')} />
          ) : null}
          <AppCardRow label="Email"           value={supplier.email} />
          <AppCardRow label="Phone"           value={supplier.phone} />
          <AppCardRow label="Telephone"       value={s.telephone} />
          <AppCardRow label="Mobile"          value={s.mobile} last />
        </AppCard>

        {/* Address */}
        {(supplier.address || s.city || s.state || s.country) ? (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Address</Text>
            <AppCardRow label="Address"   value={supplier.address} />
            <AppCardRow label="City"      value={s.city} />
            <AppCardRow label="State"     value={s.state} />
            <AppCardRow label="Country"   value={s.country} last />
          </AppCard>
        ) : null}

        {/* Edit button */}
        {canUpdate ? (
          <AppButton
            title="Edit Supplier"
            variant="primary"
            size="md"
            onPress={() => router.push(`/suppliers/${id}/edit` as any)}
            style={S.editBtn}
          />
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content:   { padding: 16, paddingBottom: 24 },
    card:      { marginBottom: 12 },
    sectionTitle: {
      fontSize: 15, fontWeight: '700', color: C.textPrimary,
      marginBottom: 14, letterSpacing: -0.2,
    },
    editBtn: { marginTop: 8 },
  });
}


export default function SupplierDetailScreen() {
  return (
    <AppPermissionGate category="supplier" action="view">
      <SupplierDetailScreenInner />
    </AppPermissionGate>
  );
}
