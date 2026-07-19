import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { productsApi } from '@/lib/api/products';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard, AppCardRow } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge, BadgeVariant } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppSkeletonList } from '@/components/ui/AppSkeleton';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useDetailFetch } from '@/lib/hooks/use-detail-fetch';
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh';
import { baseDetailStyles } from '@/lib/utils/detail-styles';
import { formatMoney } from '@/lib/utils/format';

type AppColors = typeof Colors.light | typeof Colors.dark;

function fmtPrice(v: number | undefined | null): string | null {
  if (v == null) return null;
  return formatMoney(v);
}

function ProductDetailScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const isSuperuser = user?.is_superuser ?? false;
  const canUpdate = isSuperuser || (hasPermission('product', 'update') ?? false);

  const { data: product, loading, refreshing, reload, onRefresh } = useDetailFetch(
    (prodId: number) => productsApi.getById(prodId), id, 'Failed to load product'
  );
  const pullToRefresh = usePullToRefresh(refreshing, onRefresh);

  const S = makeStyles(C);

  if (loading && !product) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Product" showBack />
      <AppSkeletonList count={3} lines={4} />
    </SafeAreaView>
  );

  if (!product) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Product" showBack />
      <View style={S.center}>
        <AppEmptyState
          variant="error"
          title="Failed to load"
          message="Could not load the product."
          actionLabel="Try Again"
          onAction={reload}
        />
      </View>
    </SafeAreaView>
  );

  const isActive = product.is_active;
  const status   = product.status;

  const getStatusVariant = (): BadgeVariant => {
    if (!isActive) return 'danger';
    if (status === 'active') return 'success';
    if (status === 'inactive') return 'danger';
    return 'info';
  };

  const unitPrice = fmtPrice(product.unit_price);
  const buyPrice  = fmtPrice(product.buy_price);
  const discount  = product.discount != null && product.discount > 0
    ? (product.discount_type === 'percentage' ? `${product.discount}%` : fmtPrice(product.discount))
    : null;

  return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader
        title={product.name || 'Product'}
        subtitle={product.code || product.sku || undefined}
        showBack
        right={
          <AppBadge variant={getStatusVariant()}>
            {isActive ? 'Active' : 'Inactive'}
          </AppBadge>
        }
      />

      <ScrollView
        contentContainerStyle={S.content}
        refreshControl={pullToRefresh}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Basic Information</Text>
          <AppCardRow label="Name"        value={product.name} />
          <AppCardRow label="Code"        value={product.code} />
          <AppCardRow label="SKU"         value={product.sku} />
          <AppCardRow label="Barcode"     value={product.barcode} />
          <AppCardRow label="Brand"       value={product.brand} />
          <AppCardRow label="Category"    value={product.category} />
          <AppCardRow label="Unit"        value={product.unit} />
          <AppCardRow label="Description" value={product.description} last />
        </AppCard>

        {/* Pricing Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Pricing Information</Text>
          <AppCardRow label="Unit Price" value={unitPrice} valueColor={unitPrice ? C.success : undefined} />
          <AppCardRow label="Buy Price"  value={buyPrice}  valueColor={buyPrice ? C.success : undefined} />
          <AppCardRow label="Discount"   value={discount} last />
        </AppCard>

        {/* Stock Information */}
        {product.track_stock ? (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Stock Information</Text>
            <AppCardRow label="Stock Balance" value={product.stock_balance != null ? String(product.stock_balance) : null} />
            <AppCardRow label="Min Stock"     value={product.min_stock_level != null ? String(product.min_stock_level) : null} />
            <AppCardRow label="Max Stock"     value={product.max_stock_level != null ? String(product.max_stock_level) : null} last />
          </AppCard>
        ) : null}

        {canUpdate ? (
          <AppButton
            title="Edit Product"
            variant="primary"
            size="md"
            onPress={() => router.push(`/products/${id}/edit`)}
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


export default function ProductDetailScreen() {
  return (
    <AppPermissionGate category="product" action="view">
      <ProductDetailScreenInner />
    </AppPermissionGate>
  );
}
