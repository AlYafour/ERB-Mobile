import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, DashboardStats, ProcurementCycleMetrics, ProjectAnalytics, RecentActivity } from '@/lib/api/dashboard';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePermissions } from '@/lib/hooks/use-permissions';

const { width: W } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const tabBarHeight = (Platform.OS === 'ios' ? 49 : 52) + Math.max(insets.bottom, 8);

  if (user && user.role !== 'super_admin' && !user.is_superuser) {
    router.replace('/purchase-requests' as any);
    return null;
  }

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cycleMetrics, setCycleMetrics] = useState<ProcurementCycleMetrics | null>(null);
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalytics[]>([]);

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const canView =
        user?.is_superuser ||
        user?.is_staff ||
        hasPermission('dashboard', 'view') ||
        hasPermission('purchase_request', 'view');

      if (!canView) {
        setStats(null);
        return;
      }

      const safe = async <T,>(fn: () => Promise<T>, def: T): Promise<T> => {
        try { return await fn(); } catch { return def; }
      };

      const emptyStats: DashboardStats = {
        purchaseRequests: { total: 0, pending: 0, approved: 0, rejected: 0 },
        quotationRequests: { total: 0, pending: 0, completed: 0 },
        suppliers: { total: 0 },
        products: { total: 0 },
        purchaseOrders: { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 },
        goodsReceiving: { total: 0 },
        invoices: { total: 0, pending: 0, approved: 0, paid: 0 },
      };

      const [statsData, cycleData, projectsData, activityData] = await Promise.all([
        safe(() => dashboardApi.getStats(), emptyStats),
        safe(() => dashboardApi.getProcurementCycleMetrics(), { avgPRToPO: 0, avgPOToGRN: 0, avgGRNToInvoice: 0, bottlenecks: [] }),
        safe(() => dashboardApi.getProjectAnalytics(), []),

        safe(() => dashboardApi.getRecentActivity(), []),
      ]);

      setStats(statsData);
      setCycleMetrics(cycleData);
      setProjectAnalytics(projectsData);
      setRecentActivity(activityData);
    } catch (error) {
      if (__DEV__) console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadDashboardData(); };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getInitial = () =>
    (user?.first_name || user?.username || 'U').charAt(0).toUpperCase();

  const formatAED = (n: number) =>
    new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(n);

  const getActionVariant = (action: string): 'success' | 'error' | 'warning' | 'info' => {
    if (action === 'approved' || action === 'paid') return 'success';
    if (action === 'rejected') return 'error';
    return 'info';
  };

  const menuItems = [
    { title: 'Purchase Requests', route: '/purchase-requests', icon: 'doc.text.fill' },
    { title: 'Purchase Orders', route: '/purchase-orders', icon: 'cart.fill' },
    { title: 'Purchase Invoices', route: '/purchase-invoices', icon: 'doc.fill' },
    { title: 'Quotation Requests', route: '/quotation-requests', icon: 'quote.bubble.fill' },
    { title: 'Purchase Quotations', route: '/purchase-quotations', icon: 'list.bullet.rectangle.fill' },
    { title: 'Goods Receiving', route: '/goods-receiving', icon: 'shippingbox.fill' },
    { title: 'Suppliers', route: '/suppliers', icon: 'building.2.fill' },
    { title: 'Products', route: '/products', icon: 'cube.box.fill' },
    { title: 'Projects', route: '/projects', icon: 'folder.fill' },
    { title: 'Users', route: '/users', icon: 'person.2.fill' },
    { title: 'Settings', route: '/settings', icon: 'gearshape.fill' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.headerRow}>
            <View style={[styles.logoBox, { backgroundColor: colors.tint }]}>
              <IconSymbol name="building.columns.fill" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: colors.text }]}>
                {getGreeting()}, {user?.first_name || 'User'}
              </Text>
              <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
                Dashboard Overview
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/notifications' as any)}
              style={[styles.headerBtn, { backgroundColor: colors.backgroundSecondary }]}>
              <IconSymbol name="bell" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile' as any)}
              style={[styles.avatarBtn, { backgroundColor: colors.tint }]}>
              <Text style={styles.avatarText}>{getInitial()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
          </View>
        ) : stats ? (
          <>
            {/* KPI Grid */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Last 30 days</Text>
              </View>
              <View style={styles.kpiGrid}>
                {[
                  { label: 'Total PRs', value: stats.purchaseRequests.total, icon: 'doc.text.fill', color: colors.tint, bg: colors.tintSubtle },
                  { label: 'Pending', value: stats.purchaseRequests.pending, icon: 'clock.fill', color: colors.warning, bg: colors.warningLight },
                  { label: 'Approved', value: stats.purchaseRequests.approved, icon: 'checkmark.circle.fill', color: colors.success, bg: colors.successLight },
                  { label: 'Rejected', value: stats.purchaseRequests.rejected, icon: 'xmark.circle.fill', color: colors.error, bg: colors.errorLight },
                ].map((kpi) => (
                  <Card key={kpi.label} style={[styles.kpiCard, { width: (W - 48) / 2 }]} padding={14}>
                    <View style={[styles.kpiIcon, { backgroundColor: kpi.bg }]}>
                      <IconSymbol name={kpi.icon as any} size={18} color={kpi.color} />
                    </View>
                    <Text style={[styles.kpiValue, { color: colors.text }]}>{kpi.value}</Text>
                    <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{kpi.label}</Text>
                  </Card>
                ))}
              </View>
            </View>

            {/* Purchase Requests Row */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Purchase Requests</Text>
                <TouchableOpacity onPress={() => router.push('/purchase-requests' as any)}>
                  <Text style={[styles.viewAll, { color: colors.tint }]}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rowGrid}>
                {[
                  { label: 'Total', value: stats.purchaseRequests.total, route: '/purchase-requests' },
                  { label: 'Pending', value: stats.purchaseRequests.pending, route: '/purchase-requests?status=pending' },
                  { label: 'Approved', value: stats.purchaseRequests.approved, route: '/purchase-requests?status=approved' },
                  { label: 'Rejected', value: stats.purchaseRequests.rejected, route: '/purchase-requests?status=rejected' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.label}
                    onPress={() => router.push(s.route as any)}
                    style={[styles.rowStatBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
                    <Text style={[styles.rowStatLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                    <Text style={[styles.rowStatValue, { color: colors.tint }]}>{s.value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Orders & Invoices */}
            <View style={styles.twoCol}>
              {[
                {
                  title: 'Orders',
                  route: '/purchase-orders',
                  items: [
                    { label: 'Total', value: stats.purchaseOrders.total },
                    { label: 'Pending', value: stats.purchaseOrders.pending },
                    { label: 'Approved', value: stats.purchaseOrders.approved },
                    { label: 'Done', value: stats.purchaseOrders.completed },
                  ],
                },
                {
                  title: 'Invoices',
                  route: '/purchase-invoices',
                  items: [
                    { label: 'Total', value: stats.invoices.total },
                    { label: 'Pending', value: stats.invoices.pending },
                    { label: 'Approved', value: stats.invoices.approved },
                    { label: 'Paid', value: stats.invoices.paid },
                  ],
                },
              ].map((section) => (
                <Card key={section.title} style={styles.halfCard} padding={14}>
                  <View style={styles.sectionHead}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{section.title}</Text>
                    <TouchableOpacity onPress={() => router.push(section.route as any)}>
                      <Text style={[styles.viewAll, { color: colors.tint }]}>All</Text>
                    </TouchableOpacity>
                  </View>
                  {section.items.map((item) => (
                    <View key={item.label} style={[styles.miniRow, { borderBottomColor: colors.borderLight }]}>
                      <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                      <Text style={[styles.miniValue, { color: colors.text }]}>{item.value}</Text>
                    </View>
                  ))}
                </Card>
              ))}
            </View>

            {/* Quick Stats */}
            <View style={styles.section}>
              <View style={styles.quickGrid}>
                {[
                  { label: 'Quotation Requests', value: stats.quotationRequests.total, route: '/quotation-requests', icon: 'dollarsign.circle.fill' },
                  { label: 'Suppliers', value: stats.suppliers.total, route: '/suppliers', icon: 'building.2.fill' },
                  { label: 'Products', value: stats.products.total, route: '/products', icon: 'cube.box.fill' },
                  { label: 'GRN', value: stats.goodsReceiving.total, route: '/goods-receiving', icon: 'shippingbox.fill' },
                ].map((q) => (
                  <TouchableOpacity
                    key={q.label}
                    onPress={() => router.push(q.route as any)}
                    style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <IconSymbol name={q.icon as any} size={24} color={colors.tint} />
                    <Text style={[styles.quickValue, { color: colors.text }]}>{q.value}</Text>
                    <Text style={[styles.quickLabel, { color: colors.textSecondary }]} numberOfLines={2}>
                      {q.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {/* Project Analytics */}
        {projectAnalytics.length > 0 && (
          <View style={styles.section}>
            <Card padding={16}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Projects</Text>
                <TouchableOpacity onPress={() => router.push('/projects' as any)}>
                  <Text style={[styles.viewAll, { color: colors.tint }]}>View All</Text>
                </TouchableOpacity>
              </View>
              {projectAnalytics.slice(0, 5).map((p) => (
                <View key={p.id} style={[styles.listRow, { borderBottomColor: colors.borderLight }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listRowTitle, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.listRowSub, { color: colors.textSecondary }]}>{p.code}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[styles.listRowValue, { color: colors.text }]}>{formatAED(p.totalSpending)}</Text>
                    <Badge variant="info">{p.poCount} POs</Badge>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <Card padding={16}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Recent Activity</Text>
              {recentActivity.slice(0, 6).map((a) => (
                <TouchableOpacity
                  key={`${a.type}-${a.id}`}
                  onPress={() => router.push(a.link as any)}
                  style={[styles.activityRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
                  <View style={styles.activityTop}>
                    <Badge variant={getActionVariant(a.action)}>{a.action}</Badge>
                    <Text style={[styles.activityType, { color: colors.textSecondary }]}>{a.type.replace('_', ' ')}</Text>
                  </View>
                  <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>{a.title}</Text>
                  <Text style={[styles.activityMeta, { color: colors.textTertiary }]}>
                    {a.user} · {new Date(a.timestamp).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        )}

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Quick Access</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
              style={[styles.menuRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.menuIcon, { backgroundColor: colors.tintSubtle }]}>
                <IconSymbol name={item.icon as any} size={20} color={colors.tint} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>{item.title}</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  greetingSub: { fontSize: 12, marginTop: 1 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  loadingWrap: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  section: { paddingHorizontal: 16, marginBottom: 4 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  sectionSub: { fontSize: 12 },
  viewAll: { fontSize: 13, fontWeight: '600' },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCard: { marginBottom: 0 },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  kpiLabel: { fontSize: 12, fontWeight: '500' },

  rowGrid: { flexDirection: 'row', gap: 8 },
  rowStatBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  rowStatLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  rowStatValue: { fontSize: 20, fontWeight: '700' },

  twoCol: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
    marginTop: 16,
  },
  halfCard: { flex: 1, marginBottom: 0 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  miniLabel: { fontSize: 12 },
  miniValue: { fontSize: 13, fontWeight: '600' },

  quickGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  quickCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  quickValue: { fontSize: 20, fontWeight: '700' },
  quickLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center' },

  listRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  listRowTitle: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  listRowSub: { fontSize: 12 },
  listRowValue: { fontSize: 13, fontWeight: '600' },

  activityRow: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
  activityTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  activityType: { fontSize: 12, textTransform: 'capitalize' },
  activityTitle: { fontSize: 13, fontWeight: '500', marginBottom: 3 },
  activityMeta: { fontSize: 11 },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
});
