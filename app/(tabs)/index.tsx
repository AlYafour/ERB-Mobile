import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';
import { Logo } from '@/components/ui/Logo';

const { width: SW } = Dimensions.get('window');
const H_PAD = 16;

interface ModuleDef {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  route: string | null;
}

const ALL_MODULES: ModuleDef[] = [
  {
    id: 'procurement',
    label: 'Procurement',
    subtitle: 'PRs · LPOs · GRNs · Invoices',
    icon: 'cart.fill',
    iconColor: '#1D4ED8',
    iconBg: '#EFF6FF',
    route: '/purchase-requests',
  },
  {
    id: 'hr',
    label: 'Human Resources',
    subtitle: 'Attendance · Leave · Payroll',
    icon: 'person.2.fill',
    iconColor: '#15803D',
    iconBg: '#F0FDF4',
    route: '/(tabs)/hr',
  },
  {
    id: 'sales',
    label: 'Sales',
    subtitle: 'Pipeline · Clients · Revenue',
    icon: 'chart.bar.fill',
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    route: null,
  },
  {
    id: 'accounts',
    label: 'Accounts',
    subtitle: 'Ledger · Payables · Reports',
    icon: 'dollarsign.circle.fill',
    iconColor: '#0369A1',
    iconBg: '#F0F9FF',
    route: null,
  },
];

const PROCUREMENT_PERMS = [
  'purchase_request', 'purchase_order', 'purchase_quotation',
  'quotation_request', 'goods_receiving', 'purchase_invoice',
  'supplier', 'product',
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

interface QuickStat {
  label: string;
  value: number | string;
  iconName: string;
  iconColor: string;
  route: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { permissions, hasPermission } = usePermissions();
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  const isDark = cs === 'dark';

  const [stats, setStats] = useState<QuickStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const hasProcurement = useMemo(
    () =>
      !!(user?.is_superuser ||
        user?.role === 'super_admin' ||
        PROCUREMENT_PERMS.some(p => hasPermission(p, 'view'))),
    [permissions, user],
  );

  const modules = useMemo(
    () =>
      ALL_MODULES.map(m => ({
        ...m,
        available: m.id === 'procurement' ? hasProcurement : m.id === 'hr',
      })),
    [hasProcurement],
  );

  const firstName = user?.first_name || user?.username || 'there';
  const roleLabel = user?.role
    ?.replace(/_/g, ' ')
    ?.replace(/\b\w/g, (ch: string) => ch.toUpperCase()) ?? '';

  // Load quick stats (pending PRs, unread notifications)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatsLoading(true);
      try {
        const [prRes, notifRes] = await Promise.allSettled([
          hasProcurement
            ? apiClient.get(API_ENDPOINTS.PURCHASE_REQUESTS + '?status=pending&page_size=1')
            : Promise.resolve({ data: null }),
          apiClient.get<{ results: any[] }>(API_ENDPOINTS.NOTIFICATIONS + '?page_size=50'),
        ]);

        if (cancelled) return;

        const prData = prRes.status === 'fulfilled' ? (prRes.value.data as any) : null;
        const prCount = prData?.count != null ? prData.count : '—';

        const notifs =
          notifRes.status === 'fulfilled' && notifRes.value.data?.results
            ? notifRes.value.data.results
            : [];

        const unread = notifs.filter((n: any) => !n.is_read).length;
        setUnreadCount(unread);

        const newStats: QuickStat[] = [];
        if (hasProcurement) {
          newStats.push({
            label: 'Pending PRs',
            value: prCount,
            iconName: 'doc.badge.clock',
            iconColor: '#D97706',
            route: '/purchase-requests?status=pending',
          });
        }
        newStats.push({
          label: 'Unread Alerts',
          value: unread,
          iconName: 'bell.badge',
          iconColor: '#1D4ED8',
          route: '/(tabs)/notifications',
        });

        setStats(newStats);
      } catch {
        // non-fatal
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [hasProcurement]);

  const cardW = (SW - H_PAD * 2 - 10) / 2;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.background }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={c.background} />

      {/* ── App bar ── */}
      <View style={[s.appBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={s.appBarLeft}>
          <View style={[s.logoWrap, { backgroundColor: c.surfaceMuted }]}>
            <Logo size={22} />
          </View>
          <View>
            <Text style={[s.appBarTitle, { color: c.textPrimary }]}>Al Yafour ERP</Text>
            <Text style={[s.appBarSub, { color: c.textMuted }]}>{getDateLabel()}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.bellWrap, { backgroundColor: c.surfaceMuted }]}
          onPress={() => router.push('/(tabs)/notifications' as any)}
          hitSlop={10}
        >
          <IconSymbol name="bell" size={18} color={c.textSecondary} />
          {unreadCount > 0 && (
            <View style={s.bellBadge}>
              <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Welcome card ── */}
        <Animated.View entering={FadeIn.duration(320)}>
          <View style={[s.welcomeCard, { backgroundColor: '#0D1B2A' }]}>
            {/* Subtle decorative circles */}
            <View style={s.decCircle1} />
            <View style={s.decCircle2} />

            <Text style={s.welcomeGreeting}>{getGreeting()},</Text>
            <Text style={s.welcomeName} numberOfLines={1}>{firstName}</Text>
            {!!roleLabel && (
              <View style={s.rolePill}>
                <Text style={s.roleText}>{roleLabel}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Quick stats ── */}
        {statsLoading ? (
          <View style={s.statsLoadRow}>
            <ActivityIndicator size="small" color={c.textMuted} />
          </View>
        ) : stats.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(80).duration(280)} style={s.statsRow}>
            {stats.map((st, i) => (
              <TouchableOpacity
                key={i}
                style={[s.statCard, { backgroundColor: c.surface, borderColor: c.border, flex: 1 }]}
                onPress={() => router.push(st.route as any)}
                activeOpacity={0.72}
              >
                <View style={[s.statIconWrap, { backgroundColor: st.iconColor + '18' }]}>
                  <IconSymbol name={st.iconName as any} size={16} color={st.iconColor} />
                </View>
                <Text style={[s.statValue, { color: c.textPrimary }]}>{st.value}</Text>
                <Text style={[s.statLabel, { color: c.textMuted }]}>{st.label}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        ) : null}

        {/* ── Modules ── */}
        <View style={[s.sectionHeader]}>
          <Text style={[s.sectionLabel, { color: c.textMuted }]}>MODULES</Text>
        </View>

        <View style={[s.grid, { gap: 10 }]}>
          {modules.map((mod, idx) => (
            <Animated.View
              key={mod.id}
              entering={FadeInDown.delay(100 + idx * 55).duration(280).springify()}
              style={{ width: cardW }}
            >
              <TouchableOpacity
                style={[
                  s.moduleCard,
                  {
                    backgroundColor: mod.available ? c.surface : c.surfaceMuted,
                    borderColor: c.border,
                    opacity: mod.available ? 1 : 0.6,
                  },
                ]}
                onPress={() => {
                  if (mod.available && mod.route) router.push(mod.route as any);
                }}
                activeOpacity={mod.available ? 0.7 : 1}
              >
                <View style={[s.moduleIconWrap, { backgroundColor: mod.available ? mod.iconBg : c.surfaceMuted }]}>
                  <IconSymbol name={mod.icon as any} size={22} color={mod.available ? mod.iconColor : c.textMuted} />
                </View>
                <Text style={[s.moduleLabel, { color: c.textPrimary }]} numberOfLines={1}>
                  {mod.label}
                </Text>
                <Text style={[s.moduleSub, { color: c.textSecondary }]} numberOfLines={2}>
                  {mod.subtitle}
                </Text>
                <View style={s.moduleFooter}>
                  {mod.available ? (
                    <View style={[s.openChip, { backgroundColor: c.primary }]}>
                      <Text style={s.openChipText}>Open</Text>
                    </View>
                  ) : (
                    <View style={[s.soonChip, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
                      <Text style={[s.soonChipText, { color: c.textMuted }]}>Soon</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* ── Quick links ── */}
        {hasProcurement && (
          <>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>QUICK ACCESS</Text>
            </View>
            <Animated.View entering={FadeInDown.delay(340).duration(280)} style={[s.quickList, { backgroundColor: c.surface, borderColor: c.border }]}>
              {[
                { icon: 'doc.text.fill', label: 'Purchase Requests', sub: 'Create & track PRs', color: '#1D4ED8', route: '/purchase-requests' },
                { icon: 'cart.fill', label: 'Purchase Orders', sub: 'LPOs & approvals', color: '#15803D', route: '/purchase-orders' },
                { icon: 'shippingbox.fill', label: 'Goods Receiving', sub: 'GRN management', color: '#7C3AED', route: '/goods-receiving' },
              ].map((item, i, arr) => (
                <TouchableOpacity
                  key={item.route}
                  style={[
                    s.quickRow,
                    { borderBottomColor: c.border },
                    i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.65}
                >
                  <View style={[s.quickIcon, { backgroundColor: item.color + '15' }]}>
                    <IconSymbol name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <View style={s.quickBody}>
                    <Text style={[s.quickLabel, { color: c.textPrimary }]}>{item.label}</Text>
                    <Text style={[s.quickSub, { color: c.textMuted }]}>{item.sub}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color={c.textMuted} />
                </TouchableOpacity>
              ))}
            </Animated.View>
          </>
        )}

        {/* ── Analytics link ── */}
        {hasProcurement && (
          <Animated.View entering={FadeIn.delay(520).duration(320)} style={{ paddingHorizontal: H_PAD, marginTop: 4 }}>
            <TouchableOpacity
              style={[s.analyticsBtn, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => router.push('/dashboard' as any)}
              activeOpacity={0.7}
            >
              <View style={[s.analyticsIcon, { backgroundColor: '#1D4ED8' + '15' }]}>
                <IconSymbol name="chart.bar.fill" size={16} color="#1D4ED8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.analyticsLabel, { color: c.textPrimary }]}>View Analytics</Text>
                <Text style={[s.analyticsSub, { color: c.textMuted }]}>KPIs · cycle metrics · activity</Text>
              </View>
              <IconSymbol name="chevron.right" size={14} color={c.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Footer ── */}
        <Animated.Text
          entering={FadeIn.delay(500).duration(400)}
          style={[s.footer, { color: c.textMuted, borderTopColor: c.border }]}
        >
          Al Yafour General Contracting & Transport LLC{'\n'}Abu Dhabi, UAE
        </Animated.Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  appBarTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  appBarSub: { fontSize: 11, marginTop: 1 },
  bellWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 14, height: 14, borderRadius: 7,
    backgroundColor: '#DC2626',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2,
  },
  bellBadgeText: { fontSize: 8, fontWeight: '700', color: '#fff' },

  scroll: { paddingTop: 0 },

  // Welcome card
  welcomeCard: {
    margin: H_PAD,
    borderRadius: 20,
    padding: 22,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  decCircle1: {
    position: 'absolute', right: -30, top: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  decCircle2: {
    position: 'absolute', right: 40, bottom: -40,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  welcomeGreeting: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  welcomeName: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  roleText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  // Stats
  statsLoadRow: { height: 80, alignItems: 'center', justifyContent: 'center' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: H_PAD,
    marginBottom: 4,
  },
  statCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, lineHeight: 30 },
  statLabel: { fontSize: 12, marginTop: 2 },

  // Section header
  sectionHeader: {
    paddingHorizontal: H_PAD,
    paddingTop: 22,
    paddingBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // Module grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: H_PAD,
    marginBottom: 6,
  },
  moduleCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  moduleIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  moduleLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4, letterSpacing: -0.2 },
  moduleSub: { fontSize: 11, lineHeight: 16, marginBottom: 14 },
  moduleFooter: { marginTop: 'auto' as any },
  openChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  openChipText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  soonChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  soonChipText: { fontSize: 11, fontWeight: '500' },

  // Quick list
  quickList: {
    marginHorizontal: H_PAD,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  quickIcon: {
    width: 40, height: 40, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  quickBody: { flex: 1 },
  quickLabel: { fontSize: 14, fontWeight: '500' },
  quickSub: { fontSize: 12, marginTop: 1 },

  analyticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  analyticsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsLabel: { fontSize: 14, fontWeight: '600' },
  analyticsSub: { fontSize: 11, marginTop: 1 },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    marginHorizontal: H_PAD,
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
