import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppBadge, BadgeVariant } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, CARD_SHADOW } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hrAttendanceApi, HRAttendance } from '@/lib/api/hr';
import { useMyEmployeeProfile } from '@/lib/hooks/use-employee-profile';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';

type AppColors = typeof Colors.light | typeof Colors.dark;

// FlashList ignores `gap` in contentContainerStyle — spacing via separator.
const ListGap = () => <View style={{ height: 10 }} />;

function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'present':   return 'success';
    case 'absent':    return 'danger';
    case 'late':      return 'warning';
    case 'half_day':
    case 'holiday':   return 'info';
    default:          return 'default';
  }
}

const STATUS_LABELS: Record<string, string> = {
  present:  'Present',
  absent:   'Absent',
  late:     'Late',
  half_day: 'Half Day',
  holiday:  'Holiday',
  on_leave: 'On Leave',
};

export default function AttendanceHistoryScreen() {
  const { employeeId, loading: profileLoading } = useMyEmployeeProfile();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<HRAttendance[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });

  // Employee-record resolution now lives in useMyEmployeeProfile — this
  // loader only fetches the attendance page(s) once that employee id is known.
  const loadData = useCallback(async (pg = 1, append = false) => {
    if (!employeeId) { setLoading(false); setRefreshing(false); return; }
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const res = await hrAttendanceApi.getAll({ employee: employeeId, page: pg });
      const newRecords = res.results ?? [];
      setRecords(prev => append ? [...prev, ...newRecords] : newRecords);
      setHasMore(!!res.next);
      setPage(pg);

      if (!append) {
        setStats({
          present: newRecords.filter((r: HRAttendance) => r.status === 'present' || r.status === 'late').length,
          absent:  newRecords.filter((r: HRAttendance) => r.status === 'absent').length,
          late:    newRecords.filter((r: HRAttendance) => r.status === 'late').length,
          total:   newRecords.length,
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (profileLoading) return;
    loadData(1);
  }, [profileLoading, loadData]);
  // Refresh the list whenever this screen regains focus.
  useRefetchOnFocus(loadData);
  const handleRefresh = () => { setRefreshing(true); loadData(1); };
  const handleLoadMore = () => { if (hasMore && !loadingMore) loadData(page + 1, true); };

  const fmtTime = (dt: string | null) =>
    dt ? new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

  const S = makeStyles(C);

  const renderItem = ({ item }: { item: HRAttendance }) => {
    const d = new Date(item.date);
    const dayNum  = d.getDate();
    const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    const monName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    const isWeekend = d.getDay() === 5 || d.getDay() === 6;

    return (
      <View style={S.card}>
        {/* Date column */}
        <View style={[S.dateCol, {
          backgroundColor: isWeekend ? C.backgroundSecondary : C.primarySoft,
          borderRightColor: C.border,
        }]}>
          <Text style={[S.dateDay, { color: isWeekend ? C.textMuted : C.primary }]}>{dayNum}</Text>
          <Text style={[S.dateName, { color: isWeekend ? C.textMuted : C.textSecondary }]}>{dayName}</Text>
          <Text style={[S.dateMon,  { color: C.textMuted }]}>{monName}</Text>
        </View>

        {/* Body */}
        <View style={S.cardBody}>
          <View style={S.topRow}>
            <AppBadge variant={getStatusVariant(item.status)}>
              {STATUS_LABELS[item.status] || item.status}
            </AppBadge>
            {item.work_hours != null && item.work_hours > 0 ? (
              <View style={[S.hoursChip, { backgroundColor: C.primarySoft }]}>
                <IconSymbol name="clock" size={11} color={C.primary} />
                <Text style={[S.hoursText, { color: C.primary }]}>
                  {item.work_hours.toFixed(1)}h
                </Text>
              </View>
            ) : null}
          </View>

          <View style={S.timesRow}>
            {/* Check in */}
            <View style={S.timeItem}>
              <View style={[S.timeDot, { backgroundColor: C.successBg }]}>
                <IconSymbol name="arrow.right" size={9} color={C.success} />
              </View>
              <View>
                <Text style={[S.timeLabel, { color: C.textMuted }]}>IN</Text>
                <Text style={[S.timeValue, { color: C.textPrimary }]}>{fmtTime(item.check_in)}</Text>
              </View>
            </View>

            <View style={[S.timeDivider, { backgroundColor: C.divider }]} />

            {/* Check out */}
            <View style={S.timeItem}>
              <View style={[S.timeDot, { backgroundColor: C.dangerBg }]}>
                <IconSymbol name="arrow.left" size={9} color={C.danger} />
              </View>
              <View>
                <Text style={[S.timeLabel, { color: C.textMuted }]}>OUT</Text>
                <Text style={[S.timeValue, { color: C.textPrimary }]}>{fmtTime(item.check_out)}</Text>
              </View>
            </View>
          </View>

          {item.check_in_address ? (
            <View style={S.addressRow}>
              <IconSymbol name="location.fill" size={10} color={C.textMuted} />
              <Text style={[S.address, { color: C.textMuted }]} numberOfLines={1}>
                {item.check_in_address}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[S.root, { backgroundColor: C.background }]} edges={['top']}>
      <AppHeader title="Attendance History" showBack />

      {/* Summary bar */}
      {!(profileLoading || loading) && records.length > 0 && (
        <View style={[S.summaryBar, { borderBottomColor: C.border }]}>
          {[
            { label: 'Days',    value: stats.total,   color: C.textPrimary, bg: C.surfaceSoft },
            { label: 'Present', value: stats.present, color: C.success,     bg: C.successBg   },
            { label: 'Absent',  value: stats.absent,  color: C.danger,      bg: C.dangerBg    },
            { label: 'Late',    value: stats.late,    color: C.warning,     bg: C.warningBg   },
          ].map(item => (
            <View key={item.label} style={[S.summaryBox, { backgroundColor: item.bg }]}>
              <Text style={[S.summaryValue, { color: item.color }]}>{item.value}</Text>
              <Text style={[S.summaryLabel, { color: item.color }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      {profileLoading || loading ? (
        <AppEmptyState variant="loading" title="Loading attendance…" />
      ) : records.length === 0 ? (
        <AppEmptyState
          variant="empty"
          icon="clock.badge.questionmark"
          title="No attendance records"
          message="No records found for your employee profile."
        />
      ) : (
        <FlashList
          data={records}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={S.list}
          ItemSeparatorComponent={ListGap}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore
              ? <View style={{ paddingVertical: 20 }}><AppEmptyState variant="loading" title="" /></View>
              : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    // gap intentionally absent — FlashList spacing comes from ListGap separator
    list: { padding: 16, paddingBottom: 32 },

    summaryBar: {
      flexDirection: 'row', gap: 8,
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    summaryBox: {
      flex: 1, alignItems: 'center',
      paddingVertical: 10, borderRadius: 12,
    },
    summaryValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    summaryLabel: {
      fontSize: 10, fontWeight: '700', marginTop: 2,
      textTransform: 'uppercase', letterSpacing: 0.4,
    },

    card: {
      backgroundColor: C.surface,
      borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.border,
      flexDirection: 'row', overflow: 'hidden',
      ...CARD_SHADOW,
    },
    dateCol: {
      width: 64, alignItems: 'center', justifyContent: 'center',
      paddingVertical: 16, gap: 1,
      borderRightWidth: StyleSheet.hairlineWidth,
    },
    dateDay:  { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    dateName: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
    dateMon:  { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },

    cardBody: { flex: 1, padding: 12, gap: 8 },
    topRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
    hoursChip: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    },
    hoursText: { fontSize: 11, fontWeight: '600' },

    timesRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    timeItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    timeDot: {
      width: 20, height: 20, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    timeDivider: { width: StyleSheet.hairlineWidth, height: 24 },
    timeLabel: {
      fontSize: 9, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1,
    },
    timeValue: { fontSize: 13, fontWeight: '600' },

    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    address:    { fontSize: 11, flex: 1 },
  });
}
