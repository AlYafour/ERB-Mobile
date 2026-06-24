import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppHeader } from '@/components/ui/AppHeader';
import { dashboardApi, DashboardStats, RecentActivity, ProcurementCycleMetrics } from '@/lib/api/dashboard';

const { width: SW } = Dimensions.get('window');
const HPAD = 16;

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: string;
  iconColor: string;
  c: typeof Colors.light;
  onPress?: () => void;
}

function KpiCard({ label, value, sub, icon, iconColor, c, onPress }: KpiCardProps) {
  return (
    <TouchableOpacity
      style={[kpi.card, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[kpi.iconWrap, { backgroundColor: iconColor + '15' }]}>
        <IconSymbol name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={[kpi.value, { color: c.textPrimary }]}>{value}</Text>
      <Text style={[kpi.label, { color: c.textMuted }]}>{label}</Text>
      {sub && <Text style={[kpi.sub, { color: iconColor }]}>{sub}</Text>}
    </TouchableOpacity>
  );
}

// ── Activity Row ─────────────────────────────────────────────────────────────
const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  purchase_request: { icon: 'doc.text.fill',    color: '#1D4ED8' },
  quotation:        { icon: 'doc.badge.plus',    color: '#7C3AED' },
  purchase_order:   { icon: 'cart.fill',         color: '#15803D' },
  grn:              { icon: 'shippingbox.fill',  color: '#0369A1' },
  invoice:          { icon: 'banknote.fill',     color: '#946200' },
};

const ACTION_COLORS: Record<string, string> = {
  created: '#1D4ED8', approved: '#15803D', rejected: '#B42318', paid: '#0E5229',
};

function ActivityRow({ item, c, onPress }: { item: RecentActivity; c: typeof Colors.light; onPress: () => void }) {
  const meta = ACTIVITY_ICONS[item.type] ?? { icon: 'doc.fill', color: '#8A97A8' };
  const actionColor = ACTION_COLORS[item.action] ?? c.textMuted;
  const ago = item.timestamp
    ? (() => {
        const diff = Date.now() - new Date(item.timestamp).getTime();
        const h = Math.floor(diff / 3600000);
        const d = Math.floor(diff / 86400000);
        if (d > 0) return `${d}d ago`;
        if (h > 0) return `${h}h ago`;
        return 'just now';
      })()
    : '';

  return (
    <TouchableOpacity
      style={[act.row, { borderBottomColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <View style={[act.iconWrap, { backgroundColor: meta.color + '15' }]}>
        <IconSymbol name={meta.icon as any} size={16} color={meta.color} />
      </View>
      <View style={act.body}>
        <Text style={[act.title, { color: c.textPrimary }]} numberOfLines={1}>{item.title || `#${item.id}`}</Text>
        <Text style={[act.meta, { color: c.textMuted }]}>{item.user} · {ago}</Text>
      </View>
      <View style={[act.badge, { backgroundColor: actionColor + '18' }]}>
        <Text style={[act.badgeText, { color: actionColor }]}>{item.action.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Cycle Metric Bar ─────────────────────────────────────────────────────────
function CycleBar({ stage, days, maxDays, c }: { stage: string; days: number; maxDays: number; c: typeof Colors.light }) {
  const pct = maxDays > 0 ? Math.min((days / maxDays) * 100, 100) : 0;
  const color = pct > 66 ? '#B42318' : pct > 33 ? '#946200' : '#15803D';
  return (
    <View style={cyc.row}>
      <Text style={[cyc.stage, { color: c.textPrimary }]}>{stage}</Text>
      <View style={[cyc.track, { backgroundColor: c.border }]}>
        <View style={[cyc.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[cyc.days, { color: c.textSecondary }]}>{days}d</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const cs = useColorScheme();
  const c = Colors[cs] as typeof Colors.light;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [cycle, setCycle] = useState<ProcurementCycleMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const [s, a, m] = await Promise.allSettled([
        dashboardApi.getStats(),
        dashboardApi.getRecentActivity(),
        dashboardApi.getProcurementCycleMetrics(),
      ]);
      if (!mounted.current) return;
      if (s.status === 'fulfilled') setStats(s.value);
      if (a.status === 'fulfilled') setActivity(a.value.slice(0, 12));
      if (m.status === 'fulfilled') setCycle(m.value);
    } catch {
      // individual failures silenced inside dashboardApi
    } finally {
      if (mounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const maxCycleDays = cycle
    ? Math.max(cycle.avgPRToPO, cycle.avgPOToGRN, cycle.avgGRNToInvoice, 1)
    : 1;

  const kpiW = (SW - HPAD * 2 - 10) / 2;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.background }]} edges={['top']}>
      <AppHeader title="Analytics" showBack={true} />

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[s.loadingText, { color: c.textMuted }]}>Loading analytics…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: 48 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textMuted} />
          }
        >
          {/* ── Procurement KPIs ── */}
          <Text style={[s.sectionLabel, { color: c.textMuted }]}>PROCUREMENT OVERVIEW</Text>
          <View style={s.grid}>
            {[
              { label: 'Purchase Requests', value: stats?.purchaseRequests.total ?? '—', sub: stats?.purchaseRequests.pending ? `${stats.purchaseRequests.pending} pending` : undefined, icon: 'doc.text.fill', iconColor: '#1D4ED8', route: '/purchase-requests' },
              { label: 'Purchase Orders', value: stats?.purchaseOrders.total ?? '—', sub: stats?.purchaseOrders.pending ? `${stats.purchaseOrders.pending} pending` : undefined, icon: 'cart.fill', iconColor: '#15803D', route: '/purchase-orders' },
              { label: 'Goods Receiving', value: stats?.goodsReceiving.total ?? '—', icon: 'shippingbox.fill', iconColor: '#0369A1', route: '/goods-receiving' },
              { label: 'Invoices', value: stats?.invoices.total ?? '—', sub: stats?.invoices.pending ? `${stats.invoices.pending} pending` : undefined, icon: 'banknote.fill', iconColor: '#946200', route: '/purchase-invoices' },
              { label: 'Suppliers', value: stats?.suppliers.total ?? '—', icon: 'building.2.fill', iconColor: '#7C3AED', route: '/suppliers' },
              { label: 'Products', value: stats?.products.total ?? '—', icon: 'cube.box.fill', iconColor: '#D97706', route: '/products' },
            ].map(k => (
              <View key={k.label} style={{ width: kpiW }}>
                <KpiCard {...k} c={c} onPress={() => router.push(k.route as any)} />
              </View>
            ))}
          </View>

          {/* ── Approval pipeline ── */}
          {stats && (
            <>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>APPROVAL PIPELINE</Text>
              <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                {[
                  { label: 'PR Approvals Pending', count: stats.purchaseRequests.pending, total: stats.purchaseRequests.total, color: '#1D4ED8', route: '/purchase-requests' },
                  { label: 'PO Approvals Pending', count: stats.purchaseOrders.pending, total: stats.purchaseOrders.total, color: '#15803D', route: '/purchase-orders' },
                  { label: 'Invoices Awaiting Payment', count: stats.invoices.pending + stats.invoices.approved, total: stats.invoices.total, color: '#946200', route: '/purchase-invoices' },
                ].map((item, i, arr) => {
                  const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      style={[pipe.row, { borderBottomColor: c.border }, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth }]}
                      onPress={() => router.push(item.route as any)}
                      activeOpacity={0.65}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={pipe.top}>
                          <Text style={[pipe.label, { color: c.textPrimary }]}>{item.label}</Text>
                          <Text style={[pipe.count, { color: item.color }]}>{item.count}</Text>
                        </View>
                        <View style={[pipe.track, { backgroundColor: c.border }]}>
                          <View style={[pipe.fill, { width: `${pct}%` as any, backgroundColor: item.color }]} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Procurement cycle ── */}
          {cycle && (cycle.avgPRToPO > 0 || cycle.avgPOToGRN > 0 || cycle.avgGRNToInvoice > 0) && (
            <>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>PROCUREMENT CYCLE (avg days)</Text>
              <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border, padding: 16 }]}>
                <CycleBar stage="PR → PO"       days={cycle.avgPRToPO}       maxDays={maxCycleDays} c={c} />
                <CycleBar stage="PO → GRN"      days={cycle.avgPOToGRN}      maxDays={maxCycleDays} c={c} />
                <CycleBar stage="GRN → Invoice" days={cycle.avgGRNToInvoice} maxDays={maxCycleDays} c={c} />
                <Text style={[s.cycleNote, { color: c.textMuted }]}>
                  Lower is better · Green &lt;33% · Amber &lt;66% · Red 66%+
                </Text>
              </View>
            </>
          )}

          {/* ── Recent activity ── */}
          {activity.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>RECENT ACTIVITY</Text>
              <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                {activity.map(item => (
                  <ActivityRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    c={c}
                    onPress={() => { if (item.link) router.push(item.link as any); }}
                  />
                ))}
              </View>
            </>
          )}

          {!stats && !activity.length && !cycle && (
            <View style={s.emptyWrap}>
              <IconSymbol name="chart.bar.xaxis" size={40} color={c.textMuted} />
              <Text style={[s.emptyText, { color: c.textMuted }]}>No data available yet</Text>
              <Text style={[s.emptySub, { color: c.textMuted }]}>Analytics will appear once procurement records are created.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 1,
} as const;

const kpi = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 10, ...CARD_SHADOW },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  value: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 30 },
  label: { fontSize: 12, marginTop: 3 },
  sub: { fontSize: 11, fontWeight: '600', marginTop: 4 },
});

const act = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: '500' },
  meta: { fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '700' },
});

const pipe = StyleSheet.create({
  row: { padding: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '500' },
  count: { fontSize: 16, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%' as any, borderRadius: 3 },
});

const cyc = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  stage: { width: 100, fontSize: 12, fontWeight: '500' },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%' as any, borderRadius: 4 },
  days: { width: 30, fontSize: 12, fontWeight: '600', textAlign: 'right' },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  scroll: { paddingHorizontal: HPAD, paddingTop: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginTop: 20, marginBottom: 10, paddingHorizontal: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', ...CARD_SHADOW },
  cycleNote: { fontSize: 10, marginTop: 4, textAlign: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 260 },
});
