import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, CARD_SHADOW } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hrPayrollApi, HRPayroll } from '@/lib/api/hr';
import { useMyEmployeeProfile } from '@/lib/hooks/use-employee-profile';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';
import { formatMoney } from '@/lib/utils/format';

type AppColors = typeof Colors.light | typeof Colors.dark;
type BadgeVariant = 'success' | 'info' | 'default';

function getPayStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'paid':      return 'success';
    case 'processed': return 'info';
    default:          return 'default';
  }
}

const fmt = (v: string | number) => formatMoney(v);

// FlashList ignores `gap` in contentContainerStyle — spacing via separator.
const ListGap = () => <View style={{ height: 12 }} />;

export default function PayslipScreen() {
  const { employeeId, loading: profileLoading } = useMyEmployeeProfile();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payrolls, setPayrolls] = useState<HRPayroll[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Employee-record resolution now lives in useMyEmployeeProfile — this
  // loader only fetches the payroll page(s) once that employee id is known.
  const loadData = useCallback(async (pg = 1, append = false) => {
    if (!employeeId) { setLoading(false); setRefreshing(false); return; }
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const res = await hrPayrollApi.getAll({ employee: employeeId, page: pg });
      const newPayrolls = res.results ?? [];
      setPayrolls(prev => append ? [...prev, ...newPayrolls] : newPayrolls);
      setHasMore(!!res.next);
      setPage(pg);
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

  const S = makeStyles(C);

  const renderItem = ({ item }: { item: HRPayroll }) => {
    const isExpanded = expanded === item.id;
    const isPaid     = item.status === 'paid';

    return (
      <TouchableOpacity
        style={[S.card, {
          borderColor: isPaid ? C.success : C.border,
        }]}
        onPress={() => setExpanded(isExpanded ? null : item.id)}
        activeOpacity={0.82}
      >
        {/* Paid top accent bar */}
        {isPaid && <View style={[S.paidBar, { backgroundColor: C.success }]} />}

        {/* Card header */}
        <View style={S.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[S.cardMonth, { color: C.textMuted }]}>
              {item.month_name} {item.year}
            </Text>
            <Text style={[S.cardNet, { color: isPaid ? C.success : C.primary }]}>
              {fmt(item.net_salary)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <AppBadge variant={getPayStatusVariant(item.status)}>
              {item.status.toUpperCase()}
            </AppBadge>
            <IconSymbol
              name={isExpanded ? 'chevron.up' : 'chevron.down'}
              size={14}
              color={C.textMuted}
            />
          </View>
        </View>

        {/* Expanded detail */}
        {isExpanded && (
          <View style={[S.detail, { borderTopColor: C.divider }]}>

            {/* Earnings */}
            <View style={[S.sectionHead, { backgroundColor: C.primarySoft }]}>
              <IconSymbol name="arrow.up.circle.fill" size={14} color={C.primary} />
              <Text style={[S.sectionHeadText, { color: C.primary }]}>Earnings</Text>
            </View>
            {([
              ['Basic Salary', item.basic_salary],
              ['Gross Salary', item.gross_salary],
            ] as [string, string][]).map(([label, value]) => (
              <View key={label} style={[S.row, { borderBottomColor: C.divider }]}>
                <Text style={[S.rowLabel, { color: C.textSecondary }]}>{label}</Text>
                <Text style={[S.rowValue, { color: C.textPrimary }]}>{fmt(value)}</Text>
              </View>
            ))}

            {/* Deductions */}
            <View style={[S.sectionHead, { backgroundColor: C.dangerBg, marginTop: 12 }]}>
              <IconSymbol name="arrow.down.circle.fill" size={14} color={C.danger} />
              <Text style={[S.sectionHeadText, { color: C.danger }]}>Deductions</Text>
            </View>
            <View style={[S.row, { borderBottomColor: C.divider }]}>
              <Text style={[S.rowLabel, { color: C.textSecondary }]}>Total Deductions</Text>
              <Text style={[S.rowValue, { color: C.danger }]}>− {fmt(item.deductions)}</Text>
            </View>

            {/* Net salary */}
            <View style={[S.netRow, { backgroundColor: isPaid ? C.successBg : C.primarySoft }]}>
              <Text style={[S.netLabel, { color: isPaid ? C.success : C.primary }]}>Net Salary</Text>
              <Text style={[S.netValue, { color: isPaid ? C.success : C.primary }]}>
                {fmt(item.net_salary)}
              </Text>
            </View>

            {/* Attendance summary */}
            <View style={[S.attRow, { backgroundColor: C.surfaceSoft }]}>
              {([
                { label: 'Working', value: item.working_days, color: C.textPrimary },
                { label: 'Present', value: item.present_days, color: C.success },
                {
                  label: 'Absent',
                  value: item.absent_days,
                  color: item.absent_days > 0 ? C.danger : C.textMuted,
                },
              ] as { label: string; value: number; color: string }[]).map(col => (
                <View key={col.label} style={S.attBox}>
                  <Text style={[S.attValue, { color: col.color }]}>{col.value}</Text>
                  <Text style={[S.attLabel, { color: C.textMuted }]}>{col.label}</Text>
                </View>
              ))}
            </View>

            {/* Paid date */}
            {item.paid_at && (
              <View style={[S.paidDateRow, { backgroundColor: C.successBg }]}>
                <IconSymbol name="checkmark.seal.fill" size={14} color={C.success} />
                <Text style={[S.paidDateText, { color: C.success }]}>
                  Paid on{' '}
                  {new Date(item.paid_at).toLocaleDateString('en-AE', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[S.root, { backgroundColor: C.background }]} edges={['top']}>
      <AppHeader title="Payslips" showBack />

      {profileLoading || loading ? (
        <AppEmptyState variant="loading" title="Loading payslips…" />
      ) : payrolls.length === 0 ? (
        <AppEmptyState
          variant="empty"
          icon="doc.text"
          title="No payslips yet"
          message="Your monthly payslips will appear here once processed."
        />
      ) : (
        <FlashList
          data={payrolls}
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

    card: {
      backgroundColor: C.surface,
      borderRadius: 18, borderWidth: 1,
      overflow: 'hidden',
      ...CARD_SHADOW,
    },
    paidBar: { height: 3 },
    cardTop: {
      flexDirection: 'row', alignItems: 'flex-start',
      padding: 16,
    },
    cardMonth: { fontSize: 12, fontWeight: '500', marginBottom: 3 },
    cardNet:   { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },

    detail: { borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 16 },

    sectionHead: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    sectionHeadText: {
      fontSize: 11, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.8,
    },

    row: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowLabel: { fontSize: 13 },
    rowValue: { fontSize: 13, fontWeight: '600' },

    netRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginHorizontal: 16, marginTop: 12,
      paddingHorizontal: 16, paddingVertical: 14,
      borderRadius: 12,
    },
    netLabel: { fontSize: 14, fontWeight: '700' },
    netValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

    attRow: {
      flexDirection: 'row', justifyContent: 'space-around',
      marginHorizontal: 16, marginTop: 12,
      paddingVertical: 16, borderRadius: 12,
    },
    attBox:   { alignItems: 'center', gap: 3 },
    attValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    attLabel: {
      fontSize: 10, fontWeight: '600',
      textTransform: 'uppercase', letterSpacing: 0.4,
    },

    paidDateRow: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      marginHorizontal: 16, marginTop: 12,
      padding: 10, borderRadius: 10,
    },
    paidDateText: { fontSize: 12, fontWeight: '600' },
  });
}
