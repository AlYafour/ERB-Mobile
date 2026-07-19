import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { suppliersApi } from '@/lib/api/suppliers';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard, AppCardRow } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppSkeletonList } from '@/components/ui/AppSkeleton';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useDetailFetch } from '@/lib/hooks/use-detail-fetch';
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh';
import { baseDetailStyles } from '@/lib/utils/detail-styles';

type AppColors = typeof Colors.light | typeof Colors.dark;

function SupplierDetailScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const isSuperuser = user?.is_superuser ?? false;
  const canUpdate = isSuperuser || (hasPermission('supplier', 'update') ?? false);

  const { data: supplier, loading, refreshing, reload, onRefresh } = useDetailFetch(
    (supId: number) => suppliersApi.getById(supId), id, 'Failed to load supplier'
  );
  const pullToRefresh = usePullToRefresh(refreshing, onRefresh);

  const S = makeStyles(C);

  if (loading && !supplier) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Supplier" showBack />
      <AppSkeletonList count={3} lines={4} />
    </SafeAreaView>
  );

  if (!supplier) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Supplier" showBack />
      <View style={S.center}>
        <AppEmptyState
          variant="error"
          title="Failed to load"
          message="Could not load the supplier."
          actionLabel="Try Again"
          onAction={reload}
        />
      </View>
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
        refreshControl={pullToRefresh}
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
    ...baseDetailStyles(C),
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
