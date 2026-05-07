import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hrPayrollApi, HRPayroll } from '@/lib/api/hr';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  processed: '#3b82f6',
  paid: '#10b981',
};

const fmt = (v: string | number) =>
  `AED ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function PayslipScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payrolls, setPayrolls] = useState<HRPayroll[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const empRes = await apiClient.get(`${API_ENDPOINTS.HR_EMPLOYEES}?page_size=100`);
      const employees = empRes.data?.results ?? [];
      const me = employees.find(
        (e: any) => e.user?.id === Number(user?.id) || String(e.user?.id) === String(user?.id)
      );
      if (!me) { setLoading(false); setRefreshing(false); return; }
      setEmployeeId(me.id);

      const res = await hrPayrollApi.getAll({ employee: me.id });
      setPayrolls(res.results ?? []);
    } catch (e) {
      console.error('Payslip load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const renderItem = ({ item }: { item: HRPayroll }) => {
    const isExpanded = expanded === item.id;
    const statusColor = STATUS_COLORS[item.status] || '#6b7280';

    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setExpanded(isExpanded ? null : item.id)}
        activeOpacity={0.8}
      >
        <View style={s.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[s.month, { color: colors.text }]}>{item.month_name} {item.year}</Text>
            <Text style={[s.net, { color: colors.tint }]}>{fmt(item.net_salary)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={[s.badge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[s.badgeText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
            </View>
            <IconSymbol
              name={isExpanded ? 'chevron.up' : 'chevron.down'}
              size={14}
              color={colors.textSecondary}
            />
          </View>
        </View>

        {isExpanded && (
          <View style={[s.detail, { borderTopColor: colors.border }]}>
            {/* Earnings */}
            <Text style={[s.sectionLabel, { color: colors.text }]}>Earnings</Text>
            {[
              ['Basic Salary', item.basic_salary],
              ['Gross Salary', item.gross_salary],
            ].map(([label, value]) => (
              <View key={label} style={s.row}>
                <Text style={[s.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[s.rowValue, { color: colors.text }]}>{fmt(value)}</Text>
              </View>
            ))}

            {/* Deductions */}
            <Text style={[s.sectionLabel, { color: colors.text, marginTop: 10 }]}>Deductions</Text>
            <View style={s.row}>
              <Text style={[s.rowLabel, { color: colors.textSecondary }]}>Total Deductions</Text>
              <Text style={[s.rowValue, { color: '#ef4444' }]}>-{fmt(item.deductions)}</Text>
            </View>

            {/* Net */}
            <View style={[s.netRow, { backgroundColor: colors.tint + '15', borderRadius: 10, marginTop: 10 }]}>
              <Text style={[s.rowLabel, { color: colors.tint, fontWeight: '700' }]}>Net Salary</Text>
              <Text style={[s.rowValue, { color: colors.tint, fontWeight: '800', fontSize: 16 }]}>{fmt(item.net_salary)}</Text>
            </View>

            {/* Attendance */}
            <View style={s.attRow}>
              {[
                ['Working', item.working_days],
                ['Present', item.present_days],
                ['Absent', item.absent_days],
              ].map(([label, value]) => (
                <View key={label} style={s.attBox}>
                  <Text style={[s.attValue, { color: colors.text }]}>{value}</Text>
                  <Text style={[s.attLabel, { color: colors.textSecondary }]}>{label}</Text>
                </View>
              ))}
            </View>

            {item.paid_at && (
              <Text style={[s.paidAt, { color: '#10b981' }]}>
                Paid on {new Date(item.paid_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Payslips" showBack />

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.tint} /></View>
      ) : payrolls.length === 0 ? (
        <View style={s.center}>
          <IconSymbol name="doc.text" size={40} color={colors.textSecondary} />
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>No payslips yet</Text>
        </View>
      ) : (
        <FlatList
          data={payrolls}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  list: { padding: 16, gap: 10 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  month: { fontSize: 14, fontWeight: '600' },
  net: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  detail: { borderTopWidth: 1, marginTop: 14, paddingTop: 14, gap: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '500' },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  attRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  attBox: { alignItems: 'center', gap: 2 },
  attValue: { fontSize: 18, fontWeight: '700' },
  attLabel: { fontSize: 11 },
  paidAt: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
