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
import { hrAttendanceApi, HRAttendance } from '@/lib/api/hr';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';

const STATUS_COLORS: Record<string, string> = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b',
  half_day: '#3b82f6',
  holiday: '#8b5cf6',
  on_leave: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
  holiday: 'Holiday',
  on_leave: 'On Leave',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AttendanceHistoryScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<HRAttendance[]>([]);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Summary stats
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });

  const loadData = useCallback(async (pg = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const empRes = await apiClient.get(`${API_ENDPOINTS.HR_EMPLOYEES}?page_size=100`);
      const employees = empRes.data?.results ?? [];
      const me = employees.find(
        (e: any) => e.user?.id === Number(user?.id) || String(e.user?.id) === String(user?.id)
      );
      if (!me) { setLoading(false); setRefreshing(false); return; }
      setEmployeeId(me.id);

      const res = await hrAttendanceApi.getAll({ employee: me.id, page: pg });
      const newRecords = res.results ?? [];
      setRecords(prev => append ? [...prev, ...newRecords] : newRecords);
      setHasMore(!!res.next);
      setPage(pg);

      if (!append) {
        const allRecords = newRecords;
        setStats({
          present: allRecords.filter((r: HRAttendance) => r.status === 'present' || r.status === 'late').length,
          absent: allRecords.filter((r: HRAttendance) => r.status === 'absent').length,
          late: allRecords.filter((r: HRAttendance) => r.status === 'late').length,
          total: allRecords.length,
        });
      }
    } catch (e) {
      console.error('Attendance history load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => { loadData(1); }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(1); };
  const handleLoadMore = () => { if (hasMore && !loadingMore) loadData(page + 1, true); };

  const fmtTime = (dt: string | null) =>
    dt ? new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

  const fmtDate = (d: string) => {
    const date = new Date(d);
    return {
      day: date.getDate(),
      weekday: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()],
      month: MONTHS[date.getMonth()],
    };
  };

  const renderItem = ({ item }: { item: HRAttendance }) => {
    const color = STATUS_COLORS[item.status] || '#6b7280';
    const { day, weekday, month } = fmtDate(item.date);

    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Date column */}
        <View style={[s.dateCol, { borderRightColor: colors.border }]}>
          <Text style={[s.dateDay, { color: colors.text }]}>{day}</Text>
          <Text style={[s.dateWeek, { color: colors.textSecondary }]}>{weekday}</Text>
          <Text style={[s.dateMon, { color: colors.textSecondary }]}>{month}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1, paddingLeft: 14, gap: 4 }}>
          <View style={[s.badge, { backgroundColor: color + '22', alignSelf: 'flex-start' }]}>
            <Text style={[s.badgeText, { color }]}>{STATUS_LABELS[item.status] || item.status}</Text>
          </View>
          <View style={s.timesRow}>
            <View style={s.timeItem}>
              <IconSymbol name="arrow.right.circle" size={13} color="#10b981" />
              <Text style={[s.timeText, { color: colors.text }]}>{fmtTime(item.check_in)}</Text>
            </View>
            <View style={s.timeItem}>
              <IconSymbol name="arrow.left.circle" size={13} color="#ef4444" />
              <Text style={[s.timeText, { color: colors.text }]}>{fmtTime(item.check_out)}</Text>
            </View>
            {item.work_hours != null && (
              <View style={s.timeItem}>
                <IconSymbol name="clock" size={13} color={colors.textSecondary} />
                <Text style={[s.timeText, { color: colors.textSecondary }]}>{item.work_hours.toFixed(1)}h</Text>
              </View>
            )}
          </View>
          {item.check_in_address ? (
            <Text style={[s.address, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.check_in_address}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Attendance History" showBack />

      {/* Summary chips */}
      {!loading && records.length > 0 && (
        <View style={[s.summaryRow, { borderBottomColor: colors.border }]}>
          {[
            { label: 'Days', value: stats.total, color: colors.text },
            { label: 'Present', value: stats.present, color: '#10b981' },
            { label: 'Absent', value: stats.absent, color: '#ef4444' },
            { label: 'Late', value: stats.late, color: '#f59e0b' },
          ].map(item => (
            <View key={item.label} style={s.summaryBox}>
              <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.tint} /></View>
      ) : records.length === 0 ? (
        <View style={s.center}>
          <IconSymbol name="clock" size={40} color={colors.textSecondary} />
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>No attendance records</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={s.loadMoreRow}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  summaryRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1 },
  summaryBox: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  list: { padding: 16, gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  dateCol: { width: 60, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRightWidth: 1, gap: 2 },
  dateDay: { fontSize: 20, fontWeight: '700' },
  dateWeek: { fontSize: 11 },
  dateMon: { fontSize: 11 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  timesRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12, fontWeight: '500' },
  address: { fontSize: 11 },
  loadMoreRow: { paddingVertical: 16, alignItems: 'center' },
});
