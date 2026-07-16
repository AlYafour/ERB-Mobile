import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator,
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

const H_PAD = 20;

interface ModuleDef {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  route: string;
}

const ALL_MODULES: ModuleDef[] = [
  {
    id: 'procurement',
    label: 'Procurement',
    subtitle: 'Purchase Requests · Orders · GRNs · Invoices',
    icon: 'cart.fill',
    iconColor: '#C9943A',
    iconBg: '#F7EEDD',
    route: '/purchase-requests',
  },
  {
    id: 'hr',
    label: 'Human Resources',
    subtitle: 'Attendance · Leave · Payroll',
    icon: 'person.2.fill',
    iconColor: '#3A7D52',
    iconBg: '#EAF4ED',
    route: '/(tabs)/hr',
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

export default function HomeScreen() {
  const { user, branding } = useAuth();
  const { isAdmin, hasPermission, hasModule } = usePermissions();
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  const isDark = cs === 'dark';

  const [statsLoading, setStatsLoading] = useState(true);
  const [pendingPRs, setPendingPRs] = useState<number | string>('—');
  const [unreadCount, setUnreadCount] = useState(0);

  // Mirrors the web sidebar rule (Sidebar.tsx): tenant module enabled AND
  // (admin OR at least one procurement view permission).
  const hasProcurement = useMemo(
    () =>
      !!(isAdmin ||
        (hasModule('procurement') && PROCUREMENT_PERMS.some(p => hasPermission(p, 'view')))),
    [isAdmin, hasModule, hasPermission],
  );

  const modules = useMemo(
    // HR stays visible to every authenticated user: the tab is employee
    // self-service (attendance / payslip / own requests), same as the web
    // hr layout's "has own employee record" rule. Manager actions inside it
    // are permission-gated individually.
    () => ALL_MODULES.filter(m => m.id === 'procurement' ? hasProcurement : true),
    [hasProcurement],
  );

  const firstName = user?.first_name || user?.username || 'there';
  const roleLabel = user?.role
    ?.replace(/_/g, ' ')
    ?.replace(/\b\w/g, (ch: string) => ch.toUpperCase()) ?? '';

  const brandPrimary = branding?.primary_color || '#0B1F33';

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
        setPendingPRs(prData?.count != null ? prData.count : '—');
        const notifs =
          notifRes.status === 'fulfilled' && notifRes.value.data?.results
            ? notifRes.value.data.results : [];
        setUnreadCount(notifs.filter((n: any) => !n.is_read).length);
      } catch {
        // non-fatal
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [hasProcurement]);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.background }]} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.background}
      />

      {/* ── App bar ── */}
      <View style={[s.appBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={s.appBarLeft}>
          <View style={[s.logoWrap, { backgroundColor: c.surfaceMuted }]}>
            <Logo size={22} logoUrl={branding?.logo_url} />
          </View>
          <View>
            <Text style={[s.appBarTitle, { color: c.textPrimary }]}>Al Yafour ERP</Text>
            <Text style={[s.appBarSub, { color: c.textMuted }]}>{getDateLabel()}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.bellBtn, { backgroundColor: c.surfaceMuted }]}
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
        contentContainerStyle={[s.scroll, { paddingBottom: 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Welcome card ── */}
        <Animated.View entering={FadeIn.duration(320)} style={s.welcomeOuter}>
          <View style={[s.welcomeCard, { backgroundColor: brandPrimary }]}>
            <View style={s.decCircle1} />
            <View style={s.decCircle2} />
            <Text style={s.welcomeGreeting}>{getGreeting()}</Text>
            <Text style={s.welcomeName} numberOfLines={1}>{firstName.toUpperCase()}</Text>
            {!!roleLabel && (
              <View style={s.rolePill}>
                <Text style={s.roleText}>{roleLabel}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Stats row ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(280)} style={s.statsRow}>
          <TouchableOpacity
            style={[s.statCard, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => hasProcurement && router.push('/purchase-requests?status=pending' as any)}
            activeOpacity={0.72}
          >
            <View style={[s.statIcon, { backgroundColor: '#B7791F18' }]}>
              <IconSymbol name="doc.badge.clock" size={16} color="#B7791F" />
            </View>
            {statsLoading
              ? <ActivityIndicator size="small" color={c.textMuted} style={{ marginVertical: 5 }} />
              : <Text style={[s.statValue, { color: c.textPrimary }]}>{pendingPRs}</Text>
            }
            <Text style={[s.statLabel, { color: c.textMuted }]}>Pending PRs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.statCard, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push('/(tabs)/notifications' as any)}
            activeOpacity={0.72}
          >
            <View style={[s.statIcon, { backgroundColor: '#C9943A18' }]}>
              <IconSymbol name="bell.badge" size={16} color="#C9943A" />
            </View>
            {statsLoading
              ? <ActivityIndicator size="small" color={c.textMuted} style={{ marginVertical: 5 }} />
              : <Text style={[s.statValue, { color: c.textPrimary }]}>{unreadCount}</Text>
            }
            <Text style={[s.statLabel, { color: c.textMuted }]}>Unread Alerts</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Modules ── */}
        {modules.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>MODULES</Text>
            </View>

            <View style={s.moduleList}>
              {modules.map((mod, idx) => (
                <Animated.View
                  key={mod.id}
                  entering={FadeInDown.delay(140 + idx * 70).duration(280)}
                >
                  <TouchableOpacity
                    style={[s.moduleCard, { backgroundColor: c.surface, borderColor: c.border }]}
                    onPress={() => router.push(mod.route as any)}
                    activeOpacity={0.72}
                  >
                    <View style={[s.moduleIcon, { backgroundColor: mod.iconBg }]}>
                      <IconSymbol name={mod.icon as any} size={26} color={mod.iconColor} />
                    </View>
                    <View style={s.moduleBody}>
                      <Text style={[s.moduleLabel, { color: c.textPrimary }]}>{mod.label}</Text>
                      <Text style={[s.moduleSub, { color: c.textMuted }]} numberOfLines={2}>
                        {mod.subtitle}
                      </Text>
                    </View>
                    <View style={[s.openBtn, { backgroundColor: brandPrimary }]}>
                      <Text style={s.openBtnText}>Open</Text>
                      <IconSymbol name="chevron.right" size={10} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </>
        )}

        {/* ── Quick Access ── */}
        {hasProcurement && (
          <>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>QUICK ACCESS</Text>
            </View>
            <Animated.View
              entering={FadeInDown.delay(320).duration(280)}
              style={[s.quickList, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              {[
                { icon: 'doc.text.fill',    label: 'Purchase Requests', sub: 'Create & track PRs',  color: '#C9943A', route: '/purchase-requests' },
                { icon: 'cart.fill',        label: 'Purchase Orders',   sub: 'LPOs & approvals',    color: '#3A7D52', route: '/purchase-orders' },
                { icon: 'shippingbox.fill', label: 'Goods Receiving',   sub: 'GRN management',      color: '#8A5A15', route: '/goods-receiving' },
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
                  <IconSymbol name="chevron.right" size={13} color={c.textMuted} />
                </TouchableOpacity>
              ))}
            </Animated.View>
          </>
        )}

        {/* ── Analytics ── */}
        {hasProcurement && (
          <Animated.View
            entering={FadeIn.delay(460).duration(280)}
            style={{ paddingHorizontal: H_PAD, marginTop: 10 }}
          >
            <TouchableOpacity
              style={[s.analyticsBtn, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => router.push('/dashboard' as any)}
              activeOpacity={0.7}
            >
              <View style={[s.analyticsIcon, { backgroundColor: '#C9943A15' }]}>
                <IconSymbol name="chart.bar.fill" size={18} color="#C9943A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.analyticsLabel, { color: c.textPrimary }]}>Analytics & KPIs</Text>
                <Text style={[s.analyticsSub, { color: c.textMuted }]}>
                  Cycle metrics · activity dashboard
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={13} color={c.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.Text
          entering={FadeIn.delay(500).duration(400)}
          style={[s.footer, { color: c.textMuted, borderTopColor: c.border }]}
        >
          Al Yafour General Contracting & Transport LLC · Abu Dhabi, UAE
        </Animated.Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  // App bar
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoWrap: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  appBarTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  appBarSub: { fontSize: 11, marginTop: 1 },
  bellBtn: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute', top: 5, right: 5,
    minWidth: 14, height: 14, borderRadius: 7,
    backgroundColor: '#DC2626',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2,
  },
  bellBadgeText: { fontSize: 8, fontWeight: '700', color: '#fff' },

  scroll: { paddingTop: 0 },

  // Welcome card
  welcomeOuter: { paddingHorizontal: H_PAD, paddingTop: H_PAD },
  welcomeCard: {
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  decCircle1: {
    position: 'absolute', right: -28, top: -28,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  decCircle2: {
    position: 'absolute', right: 50, bottom: -40,
    width: 85, height: 85, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  welcomeGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.60)', marginBottom: 4 },
  welcomeName: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  roleText: { fontSize: 11, color: 'rgba(255,255,255,0.88)', fontWeight: '600', letterSpacing: 0.3 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 4,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32 },
  statLabel: { fontSize: 12, marginTop: 3, fontWeight: '500' },

  // Section header
  sectionHeader: {
    paddingHorizontal: H_PAD,
    paddingTop: 26,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
  },

  // Modules — full-width horizontal cards
  moduleList: {
    paddingHorizontal: H_PAD,
    gap: 12,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  moduleIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  moduleBody: { flex: 1 },
  moduleLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4, letterSpacing: -0.2 },
  moduleSub: { fontSize: 12, lineHeight: 17 },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    flexShrink: 0,
  },
  openBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  // Quick access list
  quickList: {
    marginHorizontal: H_PAD,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  quickIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  quickBody: { flex: 1 },
  quickLabel: { fontSize: 14, fontWeight: '600' },
  quickSub: { fontSize: 12, marginTop: 2 },

  // Analytics button
  analyticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  analyticsIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  analyticsLabel: { fontSize: 14, fontWeight: '700' },
  analyticsSub: { fontSize: 12, marginTop: 2 },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    marginHorizontal: H_PAD,
    marginTop: 36,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
