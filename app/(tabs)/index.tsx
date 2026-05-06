import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, DashboardStats, ProcurementCycleMetrics, ProjectAnalytics, UserActivity, RecentActivity, ChartData } from '@/lib/api/dashboard';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Logo } from '@/components/ui/Logo';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { Input } from '@/components/ui/Input';
import { LineChartComponent, BarChartComponent, PieChartComponent } from '@/components/ui/Charts';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInUp,
  FadeIn,
  ZoomIn,
  Layout as AnimatedLayout,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedCard = Animated.createAnimatedComponent(Card);

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  
  // Only Super Admin can access Executive Dashboard (matching web app)
  if (user && user.role !== 'super_admin' && !user.is_superuser) {
    router.replace('/purchase-requests' as any);
    return null;
  }
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cycleMetrics, setCycleMetrics] = useState<ProcurementCycleMetrics | null>(null);
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalytics[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Check if user has permission to view dashboard
      const canViewDashboard = user?.is_superuser || 
        user?.is_staff || 
        hasPermission('dashboard', 'view') ||
        hasPermission('purchase_request', 'view');

      if (!canViewDashboard) {
        // User doesn't have permission, set empty data
        setStats(null);
        setCycleMetrics(null);
        setProjectAnalytics([]);
        setUserActivity([]);
        setRecentActivity([]);
        setChartData(null);
        return;
      }

      // Load data with silent error handling
      const loadDataSafely = async <T,>(
        apiCall: () => Promise<T>,
        defaultValue: T,
        permissionCheck?: () => boolean
      ): Promise<T> => {
        if (permissionCheck && !permissionCheck()) {
          return defaultValue;
        }
        try {
          return await apiCall();
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          const isPermissionError = 
            errorMessage.includes('permission') || 
            errorMessage.includes('Not Found') ||
            errorMessage.includes('403') ||
            errorMessage.includes('404') ||
            errorMessage.includes('You do not have permission');
          
          // Silently return default value for permission errors
          if (!isPermissionError && __DEV__) {
            console.warn('Error loading dashboard data:', error);
          }
          return defaultValue;
        }
      };

      const [statsData, cycleData, projectsData, usersData, activityData, chartsData] = await Promise.all([
        loadDataSafely(
          () => dashboardApi.getStats(),
          {
            purchaseRequests: { total: 0, pending: 0, approved: 0, rejected: 0 },
            quotationRequests: { total: 0, pending: 0, completed: 0 },
            suppliers: { total: 0 },
            products: { total: 0 },
            purchaseOrders: { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 },
            goodsReceiving: { total: 0 },
            invoices: { total: 0, pending: 0, approved: 0, paid: 0 },
          },
          () => hasPermission('purchase_request', 'view') || user?.is_superuser || false
        ),
        loadDataSafely(
          () => dashboardApi.getProcurementCycleMetrics(),
          { avgPRToPO: 0, avgPOToGRN: 0, avgGRNToInvoice: 0, bottlenecks: [] },
          () => hasPermission('purchase_request', 'view') || user?.is_superuser || false
        ),
        loadDataSafely(
          () => dashboardApi.getProjectAnalytics(),
          [],
          () => hasPermission('project', 'view') || user?.is_superuser || false
        ),
        loadDataSafely(
          () => dashboardApi.getUserActivity(),
          [],
          () => hasPermission('user', 'view') || user?.is_superuser || false
        ),
        loadDataSafely(
          () => dashboardApi.getRecentActivity(),
          [],
          () => hasPermission('purchase_request', 'view') || user?.is_superuser || false
        ),
        loadDataSafely(
          () => dashboardApi.getChartData(),
          {
            monthlyProcurement: [],
            monthlyInvoices: [],
            projectSpending: [],
            supplierComparison: [],
            statusDistribution: {
              purchaseRequests: { pending: 0, approved: 0, rejected: 0 },
              purchaseOrders: { pending: 0, approved: 0, rejected: 0, completed: 0 },
              invoices: { pending: 0, approved: 0, paid: 0 },
            },
          },
          () => hasPermission('purchase_request', 'view') || user?.is_superuser || false
        ),
      ]);

      setStats(statsData);
      setCycleMetrics(cycleData);
      setProjectAnalytics(projectsData);
      setUserActivity(usersData);
      setRecentActivity(activityData);
      setChartData(chartsData);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isPermissionError = 
        errorMessage.includes('permission') || 
        errorMessage.includes('Not Found') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404') ||
        errorMessage.includes('You do not have permission');
      
      // Only log non-permission errors
      if (!isPermissionError && __DEV__) {
        console.error('Error loading dashboard data:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const menuItems = [
    { title: 'Purchase Requests', route: '/purchase-requests', icon: 'doc.text.fill', color: '#0a7ea4' },
    { title: 'Purchase Orders', route: '/purchase-orders', icon: 'cart.fill', color: '#28a745' },
    { title: 'Purchase Invoices', route: '/purchase-invoices', icon: 'doc.fill', color: '#ffc107' },
    { title: 'Quotation Requests', route: '/quotation-requests', icon: 'quote.bubble.fill', color: '#17a2b8' },
    { title: 'Purchase Quotations', route: '/purchase-quotations', icon: 'list.bullet.rectangle.fill', color: '#6f42c1' },
    { title: 'Goods Receiving', route: '/goods-receiving', icon: 'shippingbox.fill', color: '#fd7e14' },
    { title: 'Suppliers', route: '/suppliers', icon: 'building.2.fill', color: '#20c997' },
    { title: 'Products', route: '/products', icon: 'cube.box.fill', color: '#e83e8c' },
    { title: 'Projects', route: '/projects', icon: 'folder.fill', color: '#6610f2' },
    { title: 'Users', route: '/users', icon: 'person.2.fill', color: '#dc3545' },
    { title: 'Settings', route: '/settings', icon: 'gearshape.fill', color: '#6c757d' },
  ];

  const getUserInitial = () => {
    const name = user?.first_name || user?.username || user?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  const getActionBadgeVariant = (action: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (action) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'paid':
        return 'success';
      default:
        return 'info';
    }
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case 'created':
        return 'Created';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'paid':
        return 'Paid';
      default:
        return action;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'purchase_request':
        return 'Purchase Request';
      case 'quotation':
        return 'Quotation';
      case 'purchase_order':
        return 'Purchase Order';
      case 'grn':
        return 'GRN';
      case 'invoice':
        return 'Invoice';
      default:
        return type;
    }
  };

  const formatPrice = (amount: number): string => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(amount);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={Colors.light.tint}
            colors={[Colors.light.tint]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Header */}
        <AnimatedView 
          entering={FadeIn.duration(600)}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={[Colors.light.tint, Colors.light.tintSecondary]}
                  style={styles.logoGradient}
                >
                  <IconSymbol name="building.columns.fill" size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View>
                <ThemedText style={styles.greeting}>
                  {getGreeting()}, {user?.first_name || 'User'} 👋
                </ThemedText>
                <ThemedText style={styles.headerSubtitle}>
                  Here's your dashboard overview
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => router.push('/(tabs)/notifications' as any)}
              >
                <IconSymbol name="bell.fill" size={24} color={Colors.light.text} />
                <View style={styles.notificationBadge}>
                  <ThemedText style={styles.notificationText}>3</ThemedText>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => router.push('/(tabs)/profile' as any)}
              >
                <View style={styles.profileInitials}>
                  <ThemedText style={styles.profileInitialsText}>
                    {getUserInitial()}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Premium Search Bar */}
          <AnimatedView 
            entering={FadeInUp.duration(800).delay(200)}
            style={styles.searchContainer}
          >
            <Input
              placeholder="Search requests, projects, or reports..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              containerStyle={styles.searchInput}
              style={styles.searchInputField}
              leftIcon={<IconSymbol name="magnifyingglass" size={20} color={Colors.light.textSecondary} />}
              rightIcon={
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <IconSymbol name="slider.horizontal.3" size={20} color={Colors.light.tint} />
                </TouchableOpacity>
              }
            />
          </AnimatedView>
        </AnimatedView>


        {/* Main KPIs */}
        {loading ? (
          <AnimatedCard 
            entering={FadeInUp.duration(600)}
            style={styles.loadingCard}
          >
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <ThemedText style={styles.loadingText}>Loading statistics...</ThemedText>
          </AnimatedCard>
        ) : stats ? (
          <>
            {/* Premium Stats Overview */}
            <AnimatedView 
              entering={FadeInUp.duration(800).delay(400)}
              style={styles.section}
            >
              <View style={styles.sectionHeader}>
                <ThemedText type="title" style={styles.sectionTitle}>
                  Overview
                </ThemedText>
                <ThemedText style={styles.timeRange}>Last 30 Days</ThemedText>
              </View>
              
              <View style={styles.statsGrid}>
                <AnimatedCard
                  entering={ZoomIn.delay(0).duration(500)}
                  style={styles.statCard}
                >
                  <View style={styles.statCardHeader}>
                    <View style={[styles.statIconContainer, { backgroundColor: Colors.light.tint + '15' }]}>
                      <IconSymbol name="doc.text.fill" size={20} color={Colors.light.tint} />
                    </View>
                    <Badge variant="info" style={styles.statBadge}>
                      +12%
                    </Badge>
                  </View>
                  <ThemedText style={styles.statValue}>
                    {stats.purchaseRequests.total}
                  </ThemedText>
                  <ThemedText style={styles.statTitle}>
                    Total Requests
                  </ThemedText>
                </AnimatedCard>

                <AnimatedCard
                  entering={ZoomIn.delay(100).duration(500)}
                  style={styles.statCard}
                >
                  <View style={styles.statCardHeader}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B15' }]}>
                      <IconSymbol name="clock.fill" size={20} color="#F59E0B" />
                    </View>
                    <Badge variant="warning" style={styles.statBadge}>
                      +5%
                    </Badge>
                  </View>
                  <ThemedText style={styles.statValue}>
                    {stats.purchaseRequests.pending}
                  </ThemedText>
                  <ThemedText style={styles.statTitle}>
                    Pending
                  </ThemedText>
                </AnimatedCard>

                <AnimatedCard
                  entering={ZoomIn.delay(200).duration(500)}
                  style={styles.statCard}
                >
                  <View style={styles.statCardHeader}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#10B98115' }]}>
                      <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
                    </View>
                    <Badge variant="success" style={styles.statBadge}>
                      +18%
                    </Badge>
                  </View>
                  <ThemedText style={styles.statValue}>
                    {stats.purchaseRequests.approved}
                  </ThemedText>
                  <ThemedText style={styles.statTitle}>
                    Approved
                  </ThemedText>
                </AnimatedCard>

                <AnimatedCard
                  entering={ZoomIn.delay(300).duration(500)}
                  style={styles.statCard}
                >
                  <View style={styles.statCardHeader}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#EF444415' }]}>
                      <IconSymbol name="xmark.circle.fill" size={20} color="#EF4444" />
                    </View>
                    <Badge variant="error" style={styles.statBadge}>
                      -3%
                    </Badge>
                  </View>
                  <ThemedText style={styles.statValue}>
                    {stats.purchaseRequests.rejected}
                  </ThemedText>
                  <ThemedText style={styles.statTitle}>
                    Rejected
                  </ThemedText>
                </AnimatedCard>
              </View>
            </AnimatedView>

            {/* Purchase Requests Section */}
            <AnimatedView 
              entering={FadeInUp.duration(800).delay(500)}
              style={styles.section}
            >
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Purchase Requests
                </ThemedText>
                <TouchableOpacity onPress={() => router.push('/purchase-requests' as any)}>
                  <ThemedText style={styles.viewAllLink}>View All →</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.statsGrid}>
                <TouchableOpacity
                  onPress={() => router.push('/purchase-requests' as any)}
                  style={styles.statBox}>
                  <ThemedText style={styles.statLabel}>Total</ThemedText>
                  <ThemedText style={[styles.statNumber, { color: Colors.light.tint }]}>
                    {stats.purchaseRequests.total}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/purchase-requests?status=pending' as any)}
                  style={styles.statBox}>
                  <ThemedText style={styles.statLabel}>Pending</ThemedText>
                  <ThemedText style={[styles.statNumber, { color: Colors.light.warning }]}>
                    {stats.purchaseRequests.pending}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/purchase-requests?status=approved' as any)}
                  style={styles.statBox}>
                  <ThemedText style={styles.statLabel}>Approved</ThemedText>
                  <ThemedText style={[styles.statNumber, { color: Colors.light.success }]}>
                    {stats.purchaseRequests.approved}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/purchase-requests?status=rejected' as any)}
                  style={styles.statBox}>
                  <ThemedText style={styles.statLabel}>Rejected</ThemedText>
                  <ThemedText style={[styles.statNumber, { color: Colors.light.danger }]}>
                    {stats.purchaseRequests.rejected}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </AnimatedView>

            {/* Purchase Orders & Invoices Section */}
            <View style={styles.twoColumnGrid}>
              {/* Purchase Orders */}
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Purchase Orders
                  </ThemedText>
                  <TouchableOpacity onPress={() => router.push('/purchase-orders' as any)}>
                    <ThemedText style={styles.viewAllLink}>View All →</ThemedText>
                  </TouchableOpacity>
                </View>
                <View style={styles.statsGrid}>
                  <TouchableOpacity
                    onPress={() => router.push('/purchase-orders' as any)}
                    style={styles.statBox}>
                    <ThemedText style={styles.statLabel}>Total</ThemedText>
                    <ThemedText style={[styles.statNumber, { color: '#3B82F6' }]}>
                      {stats.purchaseOrders.total}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/purchase-orders?status=pending' as any)}
                    style={styles.statBox}>
                    <ThemedText style={styles.statLabel}>Pending</ThemedText>
                    <ThemedText style={[styles.statNumber, { color: '#F59E0B' }]}>
                      {stats.purchaseOrders.pending}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/purchase-orders?status=approved' as any)}
                    style={styles.statBox}>
                    <ThemedText style={styles.statLabel}>Approved</ThemedText>
                    <ThemedText style={[styles.statNumber, { color: '#22C55E' }]}>
                      {stats.purchaseOrders.approved}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/purchase-orders?status=completed' as any)}
                    style={styles.statBox}>
                    <ThemedText style={styles.statLabel}>Completed</ThemedText>
                    <ThemedText style={[styles.statNumber, { color: '#10B981' }]}>
                      {stats.purchaseOrders.completed}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </Card>

              {/* Invoices */}
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Invoices
                  </ThemedText>
                  <TouchableOpacity onPress={() => router.push('/purchase-invoices' as any)}>
                    <ThemedText style={styles.viewAllLink}>View All →</ThemedText>
                  </TouchableOpacity>
                </View>
                <View style={styles.statsGrid}>
                  <TouchableOpacity
                    onPress={() => router.push('/purchase-invoices' as any)}
                    style={styles.statBox}>
                    <ThemedText style={styles.statLabel}>Total</ThemedText>
                    <ThemedText style={[styles.statNumber, { color: '#EC4899' }]}>
                      {stats.invoices.total}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/purchase-invoices?status=pending' as any)}
                    style={styles.statBox}>
                    <ThemedText style={styles.statLabel}>Pending</ThemedText>
                    <ThemedText style={[styles.statNumber, { color: '#F59E0B' }]}>
                      {stats.invoices.pending}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/purchase-invoices?status=approved' as any)}
                    style={styles.statBox}>
                    <ThemedText style={styles.statLabel}>Approved</ThemedText>
                    <ThemedText style={[styles.statNumber, { color: '#22C55E' }]}>
                      {stats.invoices.approved}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/purchase-invoices?status=paid' as any)}
                    style={styles.statBox}>
                    <ThemedText style={styles.statLabel}>Paid</ThemedText>
                    <ThemedText style={[styles.statNumber, { color: '#10B981' }]}>
                      {stats.invoices.paid}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStatsGrid}>
              <TouchableOpacity
                onPress={() => router.push('/quotation-requests' as any)}
                style={styles.quickStatCard}>
                <View style={styles.quickStatContent}>
                  <View>
                    <ThemedText style={styles.quickStatLabel}>Quotation Requests</ThemedText>
                    <ThemedText style={[styles.quickStatNumber, { color: '#8B5CF6' }]}>
                      {stats.quotationRequests.total}
                    </ThemedText>
                  </View>
                  <IconSymbol name="dollarsign.circle.fill" size={32} color="#8B5CF6" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/suppliers' as any)}
                style={styles.quickStatCard}>
                <View style={styles.quickStatContent}>
                  <View>
                    <ThemedText style={styles.quickStatLabel}>Suppliers</ThemedText>
                    <ThemedText style={[styles.quickStatNumber, { color: '#22C55E' }]}>
                      {stats.suppliers.total}
                    </ThemedText>
                  </View>
                  <IconSymbol name="building.2.fill" size={32} color="#22C55E" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/products' as any)}
                style={styles.quickStatCard}>
                <View style={styles.quickStatContent}>
                  <View>
                    <ThemedText style={styles.quickStatLabel}>Products</ThemedText>
                    <ThemedText style={[styles.quickStatNumber, { color: '#8B5CF6' }]}>
                      {stats.products.total}
                    </ThemedText>
                  </View>
                  <IconSymbol name="cube.box.fill" size={32} color="#8B5CF6" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/goods-receiving' as any)}
                style={styles.quickStatCard}>
                <View style={styles.quickStatContent}>
                  <View>
                    <ThemedText style={styles.quickStatLabel}>GRN</ThemedText>
                    <ThemedText style={[styles.quickStatNumber, { color: '#6366F1' }]}>
                      {stats.goodsReceiving.total}
                    </ThemedText>
                  </View>
                  <IconSymbol name="shippingbox.fill" size={32} color="#6366F1" />
                </View>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* Procurement Cycle Metrics */}
        {cycleMetrics && (
          <Card style={styles.widgetCard}>
            <ThemedText type="subtitle" style={styles.widgetTitle}>
              Procurement Cycle
            </ThemedText>
            <View style={styles.cycleItem}>
              <ThemedText style={styles.cycleLabel}>PR → PO</ThemedText>
              <ThemedText style={[styles.cycleValue, { color: '#3B82F6' }]}>
                {cycleMetrics.avgPRToPO} days
              </ThemedText>
            </View>
            <View style={styles.cycleItem}>
              <ThemedText style={styles.cycleLabel}>PO → GRN</ThemedText>
              <ThemedText style={[styles.cycleValue, { color: '#22C55E' }]}>
                {cycleMetrics.avgPOToGRN} days
              </ThemedText>
            </View>
            <View style={styles.cycleItem}>
              <ThemedText style={styles.cycleLabel}>GRN → Invoice</ThemedText>
              <ThemedText style={[styles.cycleValue, { color: '#8B5CF6' }]}>
                {cycleMetrics.avgGRNToInvoice} days
              </ThemedText>
            </View>
            {cycleMetrics.bottlenecks.length > 0 && (
              <View style={styles.bottlenecksSection}>
                <ThemedText type="subtitle" style={styles.bottlenecksTitle}>
                  Bottlenecks
                </ThemedText>
                {cycleMetrics.bottlenecks.map((bottleneck, index) => (
                  <View key={index} style={styles.bottleneckItem}>
                    <ThemedText style={styles.bottleneckLabel}>{bottleneck.stage}</ThemedText>
                    <ThemedText
                      style={[
                        styles.bottleneckDays,
                        {
                          color:
                            bottleneck.avgDays > 7
                              ? '#EF4444'
                              : bottleneck.avgDays > 3
                              ? '#F59E0B'
                              : '#22C55E',
                        },
                      ]}>
                      {bottleneck.avgDays}d
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Project Analytics */}
        {projectAnalytics.length > 0 && (
          <Card style={styles.widgetCard}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.widgetTitle}>
                Top Spending Projects
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/projects' as any)}>
                <ThemedText style={styles.viewAllLink}>View All →</ThemedText>
              </TouchableOpacity>
            </View>
            {projectAnalytics.slice(0, 5).map((project) => (
              <TouchableOpacity
                key={project.id}
                onPress={() => router.push(`/projects/view/${project.id}` as any)}
                style={styles.projectItem}>
                <View style={styles.projectInfo}>
                  <ThemedText style={styles.projectName}>{project.name}</ThemedText>
                  <ThemedText style={styles.projectCode}>{project.code}</ThemedText>
                </View>
                <View style={styles.projectStats}>
                  <ThemedText style={styles.projectSpending}>
                    {formatPrice(project.totalSpending)}
                  </ThemedText>
                  <Badge variant="info">{project.poCount} POs</Badge>
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* User Activity */}
        {userActivity.length > 0 && (
          <Card style={styles.widgetCard}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.widgetTitle}>
                Top Active Users
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/users' as any)}>
                <ThemedText style={styles.viewAllLink}>View All →</ThemedText>
              </TouchableOpacity>
            </View>
            {userActivity.slice(0, 5).map((user) => {
              const totalActivity =
                user.createdPR + user.approvedRequests + user.createdPO + user.createdInvoices;
              return (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => router.push(`/users/view/${user.id}` as any)}
                  style={styles.userActivityItem}>
                  <View style={styles.userActivityHeader}>
                    <ThemedText style={styles.userActivityName}>{user.username}</ThemedText>
                    <Badge variant="info">{totalActivity}</Badge>
                  </View>
                  <View style={styles.userActivityStats}>
                    <ThemedText style={styles.userActivityStat}>PR: {user.createdPR}</ThemedText>
                    <ThemedText style={styles.userActivityStat}>
                      Approved: {user.approvedRequests}
                    </ThemedText>
                    <ThemedText style={styles.userActivityStat}>PO: {user.createdPO}</ThemedText>
                    <ThemedText style={styles.userActivityStat}>
                      Invoices: {user.createdInvoices}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Card>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Card style={styles.widgetCard}>
            <ThemedText type="subtitle" style={styles.widgetTitle}>
              Recent Activity
            </ThemedText>
            {recentActivity.slice(0, 8).map((activity) => (
              <TouchableOpacity
                key={`${activity.type}-${activity.id}`}
                onPress={() => router.push(activity.link as any)}
                style={styles.activityItem}>
                <View style={styles.activityHeader}>
                  <Badge variant={getActionBadgeVariant(activity.action)}>
                    {getActionLabel(activity.action)}
                  </Badge>
                  <ThemedText style={styles.activityType}>{getTypeLabel(activity.type)}</ThemedText>
                </View>
                <ThemedText style={styles.activityTitle} numberOfLines={1}>
                  {activity.title}
        </ThemedText>
                <ThemedText style={styles.activityMeta}>
                  {activity.user} • {new Date(activity.timestamp).toLocaleDateString()}
        </ThemedText>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Charts Section */}
        {chartData && (
          <>
            {/* Monthly Procurement Chart */}
            {chartData.monthlyProcurement.length > 0 && (
              <Card style={styles.widgetCard}>
                <LineChartComponent
                  title="Monthly Procurement Volume"
                  data={{
                    labels: chartData.monthlyProcurement.map((item) => item.month),
                    datasets: [
                      {
                        data: chartData.monthlyProcurement.map((item) => item.count),
                        color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
                        strokeWidth: 2,
                      },
                    ],
                  }}
                  height={200}
                />
              </Card>
            )}

            {/* Monthly Invoices Chart */}
            {chartData.monthlyInvoices.length > 0 && (
              <Card style={styles.widgetCard}>
                <BarChartComponent
                  title="Monthly Invoices"
                  data={{
                    labels: chartData.monthlyInvoices.map((item) => item.month),
                    datasets: [
                      {
                        data: chartData.monthlyInvoices.map((item) => item.count),
                      },
                    ],
                  }}
                  height={200}
                />
              </Card>
            )}

            {/* Status Distribution Pie Charts */}
            <View style={styles.chartsGrid}>
              {/* Purchase Requests Status */}
              <Card style={styles.chartCard}>
                <PieChartComponent
                  title="Purchase Requests Status"
                  data={[
                    {
                      name: 'Pending',
                      value: chartData.statusDistribution.purchaseRequests.pending,
                      color: '#F59E0B',
                      legendFontColor: '#000',
                      legendFontSize: 12,
                    },
                    {
                      name: 'Approved',
                      value: chartData.statusDistribution.purchaseRequests.approved,
                      color: '#22C55E',
                      legendFontColor: '#000',
                      legendFontSize: 12,
                    },
                    {
                      name: 'Rejected',
                      value: chartData.statusDistribution.purchaseRequests.rejected,
                      color: '#EF4444',
                      legendFontColor: '#000',
                      legendFontSize: 12,
                    },
                  ]}
                  height={180}
                />
              </Card>

              {/* Purchase Orders Status */}
              <Card style={styles.chartCard}>
                <PieChartComponent
                  title="Purchase Orders Status"
                  data={[
                    {
                      name: 'Pending',
                      value: chartData.statusDistribution.purchaseOrders.pending,
                      color: '#F59E0B',
                      legendFontColor: '#000',
                      legendFontSize: 12,
                    },
                    {
                      name: 'Approved',
                      value: chartData.statusDistribution.purchaseOrders.approved,
                      color: '#22C55E',
                      legendFontColor: '#000',
                      legendFontSize: 12,
                    },
                    {
                      name: 'Completed',
                      value: chartData.statusDistribution.purchaseOrders.completed,
                      color: '#10B981',
                      legendFontColor: '#000',
                      legendFontSize: 12,
                    },
                    {
                      name: 'Rejected',
                      value: chartData.statusDistribution.purchaseOrders.rejected,
                      color: '#EF4444',
                      legendFontColor: '#000',
                      legendFontSize: 12,
                    },
                  ]}
                  height={180}
                />
              </Card>
            </View>

            {/* Invoices Status */}
            <Card style={styles.widgetCard}>
              <PieChartComponent
                title="Invoices Status"
                data={[
                  {
                    name: 'Pending',
                    value: chartData.statusDistribution.invoices.pending,
                    color: '#F59E0B',
                    legendFontColor: '#000',
                    legendFontSize: 12,
                  },
                  {
                    name: 'Approved',
                    value: chartData.statusDistribution.invoices.approved,
                    color: '#22C55E',
                    legendFontColor: '#000',
                    legendFontSize: 12,
                  },
                  {
                    name: 'Paid',
                    value: chartData.statusDistribution.invoices.paid,
                    color: '#10B981',
                    legendFontColor: '#000',
                    legendFontSize: 12,
                  },
                ]}
                height={200}
              />
            </Card>

            {/* Project Spending Chart */}
            {chartData.projectSpending.length > 0 && (
              <Card style={styles.widgetCard}>
                <BarChartComponent
                  title="Top Projects by Spending"
                  data={{
                    labels: chartData.projectSpending.slice(0, 5).map((item) => item.project),
                    datasets: [
                      {
                        data: chartData.projectSpending.slice(0, 5).map((item) => item.spending),
                      },
                    ],
                  }}
                  height={220}
                />
              </Card>
            )}
          </>
        )}

        {/* Quick Access Menu */}
        <View style={styles.menuContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Quick Access
        </ThemedText>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}>
              <Card style={styles.menuItem}>
                <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}20` }]}>
                  <IconSymbol name={item.icon as any} size={24} color={item.color} />
                </View>
                <ThemedText style={styles.menuItemText}>{item.title}</ThemedText>
                <IconSymbol name="chevron.right" size={20} color={Colors.light.icon} />
              </Card>
            </TouchableOpacity>
          ))}
        </View>
        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  logoContainer: {
    marginRight: Spacing.sm,
  },
  logoGradient: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.tint + '30',
  },
  greeting: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconButton: {
    padding: Spacing.xs,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.light.danger,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
  profileButton: {
    padding: Spacing.xs,
  },
  profileInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.tint + '30',
  },
  profileInitialsText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  searchContainer: {
    marginTop: Spacing.md,
  },
  searchInput: {
    marginBottom: 0,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.light.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInputField: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontSize: Typography.sizes.base,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.light.text,
  },
  timeRange: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  loadingCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  viewAllLink: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.tint,
    fontWeight: Typography.weights.semibold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    shadowColor: Colors.light.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
  },
  statValue: {
    fontSize: 32,
    fontWeight: Typography.weights.extrabold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  statTitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.lg,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.weights.medium,
  },
  statNumber: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.semibold,
    color: Colors.light.text,
  },
  bottomSpacing: {
    height: Platform.OS === 'ios' ? 100 : 80,
  },
  sectionCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    shadowColor: Colors.light.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Layout.cardMarginBottom,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Layout.cardMarginBottom,
  },
  quickStatCard: {
    flex: 1,
    minWidth: '45%',
  },
  quickStatContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.cardPadding,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  quickStatLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.weights.medium,
  },
  quickStatNumber: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.semibold,
    color: Colors.light.text,
  },
  widgetCard: {
    marginBottom: Layout.cardMarginBottom,
    padding: Layout.cardPadding,
  },
  widgetTitle: {
    marginBottom: Spacing.md,
  },
  cycleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  cycleLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.light.text,
  },
  cycleValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.light.text,
  },
  bottlenecksSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  bottlenecksTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
    color: Colors.light.text,
  },
  bottleneckItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  bottleneckLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.light.text,
  },
  bottleneckDays: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.light.text,
  },
  projectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
    color: Colors.light.text,
  },
  projectCode: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.normal,
  },
  projectStats: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  projectSpending: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.light.text,
  },
  userActivityItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  userActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  userActivityName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.light.text,
  },
  userActivityStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  userActivityStat: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.normal,
  },
  activityItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  activityType: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.light.text,
  },
  activityTitle: {
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.xs,
    color: Colors.light.text,
    fontWeight: Typography.weights.normal,
  },
  activityMeta: {
    fontSize: Typography.sizes.xs,
    color: Colors.light.textTertiary,
    fontWeight: Typography.weights.normal,
  },
  menuContainer: {
    marginTop: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.cardPadding,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    backgroundColor: Colors.light.tintLight,
  },
  menuItemText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.light.text,
  },
  chartsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Layout.cardMarginBottom,
  },
  chartCard: {
    flex: 1,
    minWidth: '45%',
    padding: Layout.cardPadding,
  },
});


