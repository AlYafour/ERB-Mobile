import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { productsApi } from '@/lib/api/products';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard, AppCardRow } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { Product } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';

type AppColors = typeof Colors.light | typeof Colors.dark;

function fmtPrice(v: number | undefined | null): string | null {
  if (v == null) return null;
  return `AED ${Number(v).toFixed(2)}`;
}

function ProductDetailScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isSuperuser = user?.is_superuser ?? false;
  const canUpdate = isSuperuser || (hasPermission('product', 'update') ?? false);

  const load = async () => {
    try {
      setLoading(true);
      setProduct(await productsApi.getById(id));
    } catch (err: any) {
      toast(err.message || 'Failed to load product', 'error');
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
      <AppHeader title="Product" showBack />
      <View style={S.center}><AppEmptyState variant="loading" title="Loading product..." /></View>
    </SafeAreaView>
  );

  if (!product) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Product" showBack />
      <View style={S.center}><AppEmptyState variant="empty" title="Product not found" /></View>
    </SafeAreaView>
  );

  const p = product as any;
  const isActive = p.is_active;
  const status   = product.status;

  const getStatusVariant = (): 'success' | 'danger' | 'info' | 'default' => {
    if (!isActive) return 'danger';
    if (status === 'active') return 'success';
    if (status === 'inactive') return 'danger';
    return 'info';
  };

  const unitPrice = fmtPrice(product.unit_price);
  const buyPrice  = fmtPrice(p.buy_price);
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.primary} colors={[C.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Basic Information</Text>
          <AppCardRow label="Name"        value={product.name} />
          <AppCardRow label="Code"        value={product.code} />
          <AppCardRow label="SKU"         value={product.sku} />
          <AppCardRow label="Barcode"     value={p.barcode} />
          <AppCardRow label="Brand"       value={p.brand} />
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
            onPress={() => router.push(`/products/${id}/edit` as any)}
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


export default function ProductDetailScreen() {
  return (
    <AppPermissionGate category="product" action="view">
      <ProductDetailScreenInner />
    </AppPermissionGate>
  );
}
