import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hrAttendanceApi, hrRequestsApi, hrPayrollApi, HRAttendance, HREmployee } from '@/lib/api/hr';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';

const REQUEST_TYPE_LABELS: Record<string, string> = {
  annual_leave: 'Annual Leave', sick_leave: 'Sick Leave',
  emergency_leave: 'Emergency Leave', unpaid_leave: 'Unpaid Leave',
  work_from_home: 'WFH', overtime: 'Overtime',
  advance_salary: 'Advance Salary', document_request: 'Document',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  present: '#10b981', absent: '#ef4444', late: '#f59e0b',
  half_day: '#3b82f6', holiday: '#8b5cf6', on_leave: '#6b7280',
  pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', cancelled: '#6b7280',
};

export default function HRScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<HREmployee | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<HRAttendance | null>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [latestPayroll, setLatestPayroll] = useState<any | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (todayAttendance?.check_in && !todayAttendance?.check_out) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [todayAttendance]);

  const loadData = async () => {
    try {
      // Get employee profile linked to current user
      const empRes = await apiClient.get(
        `${API_ENDPOINTS.HR_EMPLOYEES}?page_size=100`
      );
      const employees = empRes.data?.results ?? [];
      const myProfile = employees.find(
        (e: any) => e.user?.id === Number(user?.id) || String(e.user?.id) === String(user?.id)
      );
      setEmployeeProfile(myProfile ?? null);

      if (myProfile) {
        const today = new Date().toISOString().split('T')[0];
        const attRes = await apiClient.get(
          `${API_ENDPOINTS.HR_ATTENDANCE}?employee=${myProfile.id}&date=${today}`
        );
        const todayRec = attRes.data?.results?.[0] ?? null;
        setTodayAttendance(todayRec);

        const reqRes = await hrRequestsApi.getAll({ employee: myProfile.id, page: 1 });
        setRecentRequests((reqRes.results ?? []).slice(0, 3));

        const payRes = await hrPayrollApi.getAll({ employee: myProfile.id, page: 1 });
        setLatestPayroll(payRes.results?.[0] ?? null);
      }
    } catch (e) {
      console.error('HR load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const handleCheckIn = async () => {
    if (!employeeProfile) {
      Alert.alert('No HR Profile', 'You do not have an employee profile linked to your account.');
      return;
    }
    setChecking(true);
    try {
      const record = await hrAttendanceApi.checkIn({
        employee: employeeProfile.id,
      });
      setTodayAttendance(record);
      Alert.alert('Checked In ✓', `Check-in recorded at ${new Date(record.check_in!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Check-in failed');
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employeeProfile) return;
    setChecking(true);
    try {
      const record = await hrAttendanceApi.checkOut({ employee: employeeProfile.id });
      setTodayAttendance(record);
      Alert.alert(
        'Checked Out ✓',
        `Work hours: ${record.work_hours?.toFixed(1) ?? '—'} hrs`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Check-out failed');
    } finally {
      setChecking(false);
    }
  };

  const isCheckedIn = !!todayAttendance?.check_in;
  const isCheckedOut = !!todayAttendance?.check_out;

  const fmtTime = (dt: string | null) =>
    dt ? new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

  const fmtMoney = (v: string | number) =>
    `AED ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Human Resources" />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />}
        >
          {/* No HR profile warning */}
          {!employeeProfile && (
            <View style={[s.warningCard, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#f97316" />
              <Text style={[s.warningText, { color: '#9a3412' }]}>
                No employee profile linked to your account. Contact your HR admin.
              </Text>
            </View>
          )}

          {/* Employee info */}
          {employeeProfile && (
            <View style={[s.profileCard, { backgroundColor: colors.tint }]}>
              <View style={s.profileAvatar}>
                <Text style={s.profileAvatarText}>
                  {(employeeProfile.full_name || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.profileName}>{employeeProfile.full_name}</Text>
                <Text style={s.profileMeta}>
                  {employeeProfile.position_title || employeeProfile.department_name || 'Employee'} · {employeeProfile.employee_id}
                </Text>
              </View>
              <View style={[s.activeBadge, { backgroundColor: employeeProfile.is_active ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: employeeProfile.is_active ? '#166534' : '#991b1b' }}>
                  {employeeProfile.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          )}

          {/* Attendance check-in/out */}
          {employeeProfile && (
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Today's Attendance</Text>

              <View style={s.timeRow}>
                <View style={s.timeBox}>
                  <Text style={[s.timeLabel, { color: colors.textSecondary }]}>Check In</Text>
                  <Text style={[s.timeValue, { color: isCheckedIn ? '#10b981' : colors.textSecondary }]}>
                    {fmtTime(todayAttendance?.check_in ?? null)}
                  </Text>
                </View>
                <View style={[s.timeDivider, { backgroundColor: colors.border }]} />
                <View style={s.timeBox}>
                  <Text style={[s.timeLabel, { color: colors.textSecondary }]}>Check Out</Text>
                  <Text style={[s.timeValue, { color: isCheckedOut ? '#10b981' : colors.textSecondary }]}>
                    {fmtTime(todayAttendance?.check_out ?? null)}
                  </Text>
                </View>
                {todayAttendance?.work_hours && (
                  <>
                    <View style={[s.timeDivider, { backgroundColor: colors.border }]} />
                    <View style={s.timeBox}>
                      <Text style={[s.timeLabel, { color: colors.textSecondary }]}>Hours</Text>
                      <Text style={[s.timeValue, { color: colors.text }]}>
                        {todayAttendance.work_hours.toFixed(1)}h
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {todayAttendance?.status && (
                <View style={[s.statusPill, { backgroundColor: (STATUS_COLORS[todayAttendance.status] || '#6b7280') + '20' }]}>
                  <Text style={[s.statusText, { color: STATUS_COLORS[todayAttendance.status] || '#6b7280' }]}>
                    {todayAttendance.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              )}

              {!isCheckedOut && (
                <Animated.View style={{ transform: [{ scale: isCheckedIn ? pulseAnim : 1 }] }}>
                  <TouchableOpacity
                    style={[s.checkBtn, { backgroundColor: isCheckedIn ? '#ef4444' : '#10b981' }]}
                    onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
                    disabled={checking}
                    activeOpacity={0.85}
                  >
                    {checking ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <IconSymbol name={isCheckedIn ? 'stop.circle.fill' : 'play.circle.fill'} size={20} color="#fff" />
                        <Text style={s.checkBtnText}>
                          {isCheckedIn ? 'Check Out' : 'Check In'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              )}
              {isCheckedOut && (
                <View style={[s.doneRow, { backgroundColor: '#f0fdf4' }]}>
                  <IconSymbol name="checkmark.circle.fill" size={16} color="#10b981" />
                  <Text style={{ fontSize: 13, color: '#166534', marginLeft: 6 }}>Attendance complete for today</Text>
                </View>
              )}
            </View>
          )}

          {/* Quick actions */}
          <View style={s.quickRow}>
            {[
              { icon: 'calendar', label: 'My Requests', route: '/hr/requests' },
              { icon: 'doc.text', label: 'Payslip', route: '/hr/payslip' },
              { icon: 'clock', label: 'Attendance\nHistory', route: '/hr/attendance-history' },
            ].map(item => (
              <TouchableOpacity
                key={item.route}
                style={[s.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.75}
              >
                <IconSymbol name={item.icon as any} size={22} color={colors.tint} />
                <Text style={[s.quickLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent requests */}
          {recentRequests.length > 0 && (
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.cardHeader}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Requests</Text>
                <TouchableOpacity onPress={() => router.push('/hr/requests' as any)}>
                  <Text style={[s.seeAll, { color: colors.tint }]}>See All</Text>
                </TouchableOpacity>
              </View>
              {recentRequests.map(req => (
                <View key={req.id} style={[s.reqRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.reqType, { color: colors.text }]}>
                      {REQUEST_TYPE_LABELS[req.request_type] || req.request_type}
                    </Text>
                    <Text style={[s.reqDate, { color: colors.textSecondary }]}>
                      {req.start_date ? new Date(req.start_date).toLocaleDateString() : new Date(req.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[s.reqBadge, { backgroundColor: (STATUS_COLORS[req.status] || '#6b7280') + '20' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: STATUS_COLORS[req.status] || '#6b7280' }}>
                      {req.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Latest payslip */}
          {latestPayroll && (
            <TouchableOpacity
              style={[s.card, s.payCard, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/hr/payslip' as any)}
              activeOpacity={0.85}
            >
              <View>
                <Text style={s.payMonth}>{latestPayroll.month_name} {latestPayroll.year}</Text>
                <Text style={s.payLabel}>Net Salary</Text>
                <Text style={s.payAmount}>{fmtMoney(latestPayroll.net_salary)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[s.payStatusBadge, {
                  backgroundColor: latestPayroll.status === 'paid' ? '#dcfce7' : '#fff7ed'
                }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: latestPayroll.status === 'paid' ? '#166534' : '#9a3412' }}>
                    {latestPayroll.status.toUpperCase()}
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={18} color="rgba(255,255,255,0.7)" style={{ marginTop: 16 }} />
              </View>
            </TouchableOpacity>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 12 },
  warningCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  warningText: { flex: 1, fontSize: 13, lineHeight: 18 },
  profileCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  profileName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  profileMeta: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  seeAll: { fontSize: 13, fontWeight: '500' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeBox: { flex: 1, alignItems: 'center', gap: 4 },
  timeLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeValue: { fontSize: 18, fontWeight: '700' },
  timeDivider: { width: 1, height: 32 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  checkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  checkBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1 },
  quickLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  reqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  reqType: { fontSize: 13, fontWeight: '500' },
  reqDate: { fontSize: 11, marginTop: 2 },
  reqBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  payCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  payMonth: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  payLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  payAmount: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  payStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
});
