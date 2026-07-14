import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppBadge } from '@/components/ui/AppBadge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppBottomSheet, SheetAction } from '@/components/ui/AppBottomSheet';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hrAttendanceApi, hrRequestsApi, hrPayrollApi, HRAttendance, HREmployee, HRLeaveBalance } from '@/lib/api/hr';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';
import { toast } from '@/lib/hooks/use-toast';

const { width: SW } = Dimensions.get('window');

const REQUEST_TYPE_LABELS: Record<string, string> = {
  annual_leave: 'Annual Leave', sick_leave: 'Sick Leave',
  emergency_leave: 'Emergency Leave', unpaid_leave: 'Unpaid Leave',
  work_from_home: 'WFH', overtime: 'Overtime',
  advance_salary: 'Advance Salary', document_request: 'HR Letter',
  other: 'Miscellaneous',
};

type AppColors = typeof Colors.light | typeof Colors.dark;

function attColor(status: string, C: AppColors): string {
  switch (status) {
    case 'present':            return C.success;
    case 'absent':             return C.danger;
    case 'late':               return C.warning;
    case 'half_day':
    case 'holiday':            return C.info;
    default:                   return C.textMuted;
  }
}

function attBg(status: string, C: AppColors): string {
  switch (status) {
    case 'present':            return C.successBg;
    case 'absent':             return C.dangerBg;
    case 'late':               return C.warningBg;
    case 'half_day':
    case 'holiday':            return C.infoBg;
    default:                   return C.surfaceSoft;
  }
}

type ReqBadgeVariant = 'success' | 'danger' | 'warning' | 'default';
function reqStatusVariant(status: string): ReqBadgeVariant {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    case 'pending':  return 'warning';
    default:         return 'default';
  }
}

const HR_ACTIONS = [
  { id: 'annual_leave',     icon: 'calendar',              label: 'Time Off',             sub: 'Annual, sick, emergency leave' },
  { id: 'work_from_home',   icon: 'laptopcomputer',         label: 'Work From Home',       sub: 'WFH request' },
  { id: 'overtime',         icon: 'clock.fill',             label: 'Overtime',             sub: 'Submit overtime hours' },
  { id: 'advance_salary',   icon: 'dollarsign.circle.fill', label: 'Loan / Advance',       sub: 'Salary advance or loan' },
  { id: 'document_request', icon: 'doc.text.fill',          label: 'HR Letter',            sub: 'Experience letter, NOC, etc.' },
  { id: 'other',            icon: 'ellipsis.circle.fill',   label: 'Miscellaneous',        sub: 'Other requests' },
];

const ICON_COLORS = ['#1D4ED8','#15803D','#D97706','#0369A1','#7C3AED','#6B7280'];

export default function HRScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<HREmployee | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<HRAttendance | null>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [latestPayroll, setLatestPayroll] = useState<any | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<HRLeaveBalance[]>([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (todayAttendance?.check_in && !todayAttendance?.check_out) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [todayAttendance]);

  const loadData = async () => {
    if (!user) { setLoading(false); setRefreshing(false); return; }
    try {
      const empRes = await apiClient.get<any>(API_ENDPOINTS.HR_EMPLOYEES);
      const employees: any[] = Array.isArray(empRes.data) ? empRes.data : ((empRes.data as any)?.results ?? []);
      const myProfile = employees.find(
        (e: any) => e.user?.id === Number(user?.id) || String(e.user?.id) === String(user?.id)
      );
      setEmployeeProfile(myProfile ?? null);

      if (myProfile) {
        const today = new Date().toISOString().split('T')[0];
        const year = new Date().getFullYear();
        const [attRes, reqRes, payRes, leaveRes] = await Promise.allSettled([
          apiClient.get(`${API_ENDPOINTS.HR_ATTENDANCE}?employee=${myProfile.id}&date=${today}`),
          hrRequestsApi.getAll({ employee: myProfile.id, page: 1 }),
          hrPayrollApi.getAll({ employee: myProfile.id, page: 1 }),
          hrRequestsApi.getLeaveBalances(myProfile.id, year),
        ]);

        if (attRes.status === 'fulfilled') {
          setTodayAttendance((attRes.value.data as any)?.results?.[0] ?? null);
        }
        if (reqRes.status === 'fulfilled') {
          setRecentRequests(((reqRes.value as any).results ?? []).slice(0, 4));
        }
        if (payRes.status === 'fulfilled') {
          setLatestPayroll(((payRes.value as any).results)?.[0] ?? null);
        }
        if (leaveRes.status === 'fulfilled') {
          setLeaveBalance(leaveRes.value ?? []);
        }
      }
    } catch (e) {
      if (__DEV__) console.error('HR load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);
  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const handleCheckIn = async () => {
    setChecking(true);
    try {
      const record = await hrAttendanceApi.checkIn();
      setTodayAttendance(record);
      toast(`Checked in at ${new Date(record.check_in!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, 'success');
    } catch (e: any) {
      toast(e.message || 'Check-in failed', 'error');
    } finally { setChecking(false); }
  };

  const handleCheckOut = async () => {
    setChecking(true);
    try {
      const record = await hrAttendanceApi.checkOut();
      setTodayAttendance(record);
      toast(`Checked out · ${record.work_hours?.toFixed(1) ?? '—'} hrs`, 'success');
    } catch (e: any) {
      toast(e.message || 'Check-out failed', 'error');
    } finally { setChecking(false); }
  };

  const handleBreakOut = async () => {
    setChecking(true);
    try {
      const record = await hrAttendanceApi.breakOut();
      setTodayAttendance(record);
      toast('Break started', 'success');
    } catch (e: any) {
      toast(e.message || 'Failed to start break', 'error');
    } finally { setChecking(false); }
  };

  const handleBreakIn = async () => {
    setChecking(true);
    try {
      const record = await hrAttendanceApi.breakIn();
      setTodayAttendance(record);
      toast('Break ended — welcome back', 'success');
    } catch (e: any) {
      toast(e.message || 'Failed to end break', 'error');
    } finally { setChecking(false); }
  };

  const isCheckedIn  = !!todayAttendance?.check_in;
  const isCheckedOut = !!todayAttendance?.check_out;
  const isOnBreak    = !!todayAttendance?.break_start && !todayAttendance?.break_end;
  const fmtTime = (dt: string | null) =>
    dt ? new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtMoney = (v: string | number) =>
    `AED ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

  // ── Loading state ──
  if (loading) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: c.background }]} edges={['top']}>
        <AppHeader title="Human Resources" />
        <AppEmptyState variant="loading" title="Loading HR data…" />
      </SafeAreaView>
    );
  }

  // ── No employee profile — designed landing ──
  if (!employeeProfile) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: c.background }]} edges={['top']}>
        <AppHeader title="Human Resources" />
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.textMuted} />}
        >
          {/* Explanation card */}
          <View style={[s.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[s.infoIconWrap, { backgroundColor: c.infoBg }]}>
              <IconSymbol name="person.crop.circle.badge.exclamationmark" size={32} color={c.info} />
            </View>
            <Text style={[s.infoTitle, { color: c.textPrimary }]}>No Employee Profile Linked</Text>
            <Text style={[s.infoMsg, { color: c.textSecondary }]}>
              Your account is not yet linked to an employee record. Please contact your HR administrator to set up your profile.
            </Text>
            <TouchableOpacity
              style={[s.infoBtn, { backgroundColor: c.primary }]}
              onPress={handleRefresh}
              activeOpacity={0.8}
            >
              <IconSymbol name="arrow.clockwise" size={15} color="#fff" />
              <Text style={s.infoBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Greyed-out preview cards */}
          <Text style={[s.sectionLabel, { color: c.textMuted }]}>AVAILABLE WHEN LINKED</Text>

          {[
            { icon: 'clock.fill',               color: '#10b981', label: 'Attendance',      sub: 'Check in / check out' },
            { icon: 'calendar',                  color: '#1D4ED8', label: 'Leave Balance',   sub: 'Annual, sick, emergency' },
            { icon: 'doc.text.fill',             color: '#7C3AED', label: 'My Requests',     sub: 'Leave, WFH, overtime' },
            { icon: 'dollarsign.circle.fill',    color: '#D97706', label: 'Payslip',         sub: 'Monthly payroll details' },
          ].map((item, i) => (
            <View key={i} style={[s.previewRow, { backgroundColor: c.surface, borderColor: c.border, opacity: 0.45 }]}>
              <View style={[s.previewIcon, { backgroundColor: item.color + '15' }]}>
                <IconSymbol name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={s.previewBody}>
                <Text style={[s.previewLabel, { color: c.textPrimary }]}>{item.label}</Text>
                <Text style={[s.previewSub, { color: c.textMuted }]}>{item.sub}</Text>
              </View>
              <IconSymbol name="lock.fill" size={14} color={c.textMuted} />
            </View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Full linked state ──
  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.background }]} edges={['top']}>
      <AppHeader
        title="Human Resources"
        right={
          <TouchableOpacity onPress={() => setSheetVisible(true)} hitSlop={8} activeOpacity={0.7}>
            <IconSymbol name="plus" size={22} color={c.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.textMuted} />}
      >
        {/* ── Profile card ── */}
        <View style={[s.profileCard, { backgroundColor: c.primary }]}>
          <View style={s.profileAvatarWrap}>
            <View style={s.profileAvatar}>
              <Text style={s.profileAvatarText}>
                {(employeeProfile.full_name || '?')[0].toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.profileName} numberOfLines={1}>{employeeProfile.full_name}</Text>
            <Text style={s.profileMeta} numberOfLines={1}>
              {employeeProfile.position_title || employeeProfile.department_name || 'Employee'}
            </Text>
            <Text style={s.profileId}>ID: {employeeProfile.employee_id}</Text>
          </View>
          <View style={[s.activeBadge, {
            backgroundColor: employeeProfile.is_active ? c.successBg : c.dangerBg,
          }]}>
            <View style={[s.activeDot, { backgroundColor: employeeProfile.is_active ? c.success : c.danger }]} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: employeeProfile.is_active ? c.successText : c.errorText }}>
              {employeeProfile.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* ── Today attendance ── */}
        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: c.textPrimary }]}>Today's Attendance</Text>
            <Text style={[s.cardSub, { color: c.textMuted }]}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>

          <View style={s.timeRow}>
            {[
              { label: 'Check In',  value: fmtTime(todayAttendance?.check_in  ?? null), active: isCheckedIn },
              { label: 'Break',     value: todayAttendance?.break_start ? (todayAttendance.break_end ? `${fmtTime(todayAttendance.break_start)}–${fmtTime(todayAttendance.break_end)}` : `${fmtTime(todayAttendance.break_start)}…`) : '—', active: !!todayAttendance?.break_start },
              { label: 'Check Out', value: fmtTime(todayAttendance?.check_out ?? null), active: isCheckedOut },
              { label: 'Hours',     value: todayAttendance?.work_hours ? `${todayAttendance.work_hours.toFixed(1)}h` : '—', active: !!todayAttendance?.work_hours },
            ].map((col, i, arr) => (
              <View key={col.label} style={[s.timeCol, i < arr.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: c.border }]}>
                <Text style={[s.timeLabel, { color: c.textMuted }]}>{col.label}</Text>
                <Text style={[s.timeValue, { color: col.active ? c.success : c.textPrimary, fontSize: col.label === 'Break' ? 10 : 15 }]}>{col.value}</Text>
              </View>
            ))}
          </View>

          {isOnBreak && (
            <View style={[s.statusPill, { backgroundColor: c.warningBg }]}>
              <View style={[s.statusDot, { backgroundColor: c.warning }]} />
              <Text style={[s.statusText, { color: c.warningText }]}>On Break · since {fmtTime(todayAttendance!.break_start)}</Text>
            </View>
          )}
          {!isOnBreak && todayAttendance?.status && (
            <View style={[s.statusPill, { backgroundColor: attBg(todayAttendance.status, c) }]}>
              <View style={[s.statusDot, { backgroundColor: attColor(todayAttendance.status, c) }]} />
              <Text style={[s.statusText, { color: attColor(todayAttendance.status, c) }]}>
                {todayAttendance.status.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}
              </Text>
            </View>
          )}

          {isCheckedOut ? (
            <View style={[s.doneRow, { backgroundColor: c.successBg }]}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={c.success} />
              <Text style={{ fontSize: 13, color: c.successText, marginLeft: 6, fontWeight: '500' }}>
                Attendance complete for today
              </Text>
            </View>
          ) : isOnBreak ? (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[s.checkBtn, { backgroundColor: c.warning }]}
                onPress={handleBreakIn}
                disabled={checking}
                activeOpacity={0.85}
              >
                {checking ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <IconSymbol name="arrow.uturn.left.circle.fill" size={20} color="#fff" />
                    <Text style={s.checkBtnText}>End Break</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          ) : isCheckedIn ? (
            <View style={{ gap: 10 }}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[s.checkBtn, { backgroundColor: c.danger }]}
                  onPress={handleCheckOut}
                  disabled={checking}
                  activeOpacity={0.85}
                >
                  {checking ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <IconSymbol name="stop.circle.fill" size={20} color="#fff" />
                      <Text style={s.checkBtnText}>Check Out</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
              {!todayAttendance?.break_start && (
                <TouchableOpacity
                  style={[s.checkBtn, { backgroundColor: c.warning }]}
                  onPress={handleBreakOut}
                  disabled={checking}
                  activeOpacity={0.85}
                >
                  <IconSymbol name="pause.circle.fill" size={20} color="#fff" />
                  <Text style={s.checkBtnText}>Start Break</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[s.checkBtn, { backgroundColor: c.success }]}
              onPress={handleCheckIn}
              disabled={checking}
              activeOpacity={0.85}
            >
              {checking ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <IconSymbol name="play.circle.fill" size={20} color="#fff" />
                  <Text style={s.checkBtnText}>Check In</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Quick actions ── */}
        <Text style={[s.sectionLabel, { color: c.textMuted }]}>QUICK ACTIONS</Text>
        <View style={s.quickGrid}>
          {[
            { icon: 'list.bullet.clipboard', label: 'My Requests',   route: '/hr/requests',          color: '#1D4ED8' },
            { icon: 'clock',                label: 'History',       route: '/hr/attendance-history', color: '#15803D' },
            { icon: 'dollarsign.circle',    label: 'Payslip',       route: '/hr/payslip',            color: '#D97706' },
            { icon: 'plus.circle.fill',     label: 'New Request',   route: null,                     color: '#7C3AED' },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={[s.quickCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => item.route ? router.push(item.route as any) : setSheetVisible(true)}
              activeOpacity={0.72}
            >
              <View style={[s.quickIcon, { backgroundColor: item.color + '15' }]}>
                <IconSymbol name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={[s.quickLabel, { color: c.textPrimary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Leave balance ── */}
        {leaveBalance.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { color: c.textMuted }]}>LEAVE BALANCE · {new Date().getFullYear()}</Text>
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              {leaveBalance.slice(0, 4).map((lb, i, arr) => (
                <View
                  key={lb.id}
                  style={[
                    s.leaveRow,
                    { borderBottomColor: c.border },
                    i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.leaveType, { color: c.textPrimary }]}>
                      {lb.leave_type.replace(/_/g, ' ').replace(/\b\w/g, (ch: string) => ch.toUpperCase())}
                    </Text>
                    <Text style={[s.leaveMeta, { color: c.textMuted }]}>
                      Used {lb.used_days} · Pending {lb.pending_days}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.leaveRemaining, {
                      color: Number(lb.remaining_days) > 0 ? c.success : c.danger,
                    }]}>
                      {lb.remaining_days}
                    </Text>
                    <Text style={[s.leaveDaysLabel, { color: c.textMuted }]}>days left</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Latest payslip ── */}
        {latestPayroll && (
          <>
            <Text style={[s.sectionLabel, { color: c.textMuted }]}>LATEST PAYSLIP</Text>
            <TouchableOpacity
              style={[s.payCard, { backgroundColor: c.primary }]}
              onPress={() => router.push('/hr/payslip' as any)}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.payMonth}>{latestPayroll.month_name} {latestPayroll.year}</Text>
                <Text style={s.payNetLabel}>Net Salary</Text>
                <Text style={s.payAmount}>{fmtMoney(latestPayroll.net_salary)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <AppBadge variant={latestPayroll.status === 'paid' ? 'success' : 'info'}>
                  {latestPayroll.status.toUpperCase()}
                </AppBadge>
                <IconSymbol name="chevron.right" size={16} color={c.primaryText + '80'} />
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* ── Recent requests ── */}
        {recentRequests.length > 0 && (
          <>
            <View style={[s.sectionRow]}>
              <Text style={[s.sectionLabel, { color: c.textMuted, paddingTop: 0 }]}>RECENT REQUESTS</Text>
              <TouchableOpacity onPress={() => router.push('/hr/requests' as any)}>
                <Text style={[s.seeAll, { color: c.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={[s.reqList, { backgroundColor: c.surface, borderColor: c.border }]}>
              {recentRequests.map((req, i, arr) => (
                <View
                  key={req.id}
                  style={[s.reqRow, { borderBottomColor: c.border },
                    i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.reqType, { color: c.textPrimary }]}>
                      {REQUEST_TYPE_LABELS[req.request_type] || req.request_type}
                    </Text>
                    <Text style={[s.reqDate, { color: c.textMuted }]}>
                      {req.start_date
                        ? new Date(req.start_date).toLocaleDateString('en-AE', { month: 'short', day: 'numeric', year: 'numeric' })
                        : new Date(req.created_at).toLocaleDateString('en-AE', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <AppBadge variant={reqStatusVariant(req.status)}>
                    {req.status.toUpperCase()}
                  </AppBadge>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── HR Request Bottom Sheet ── */}
      <AppBottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="New Request"
      >
        {HR_ACTIONS.map((action, i) => (
          <SheetAction
            key={action.id}
            icon={<IconSymbol name={action.icon as any} size={20} color={ICON_COLORS[i % ICON_COLORS.length]} />}
            label={action.label}
            sublabel={action.sub}
            onPress={() => {
              setSheetVisible(false);
              router.push({ pathname: '/hr/requests' as any, params: { type: action.id } });
            }}
          />
        ))}
        <View style={{ height: 8 }} />
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
} as const;

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, gap: 12 },

  // ── No profile state ──
  infoCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    ...CARD_SHADOW,
  },
  infoIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  infoTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', letterSpacing: -0.2 },
  infoMsg: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  infoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 24, marginTop: 4,
  },
  infoBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  previewRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    ...CARD_SHADOW,
  },
  previewIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  previewBody: { flex: 1 },
  previewLabel: { fontSize: 14, fontWeight: '500' },
  previewSub: { fontSize: 12, marginTop: 1 },

  // ── Section labels ──
  sectionLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.4,
    paddingHorizontal: 2, paddingTop: 10, paddingBottom: 6,
  },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 10, paddingBottom: 6,
  },
  seeAll: { fontSize: 13, fontWeight: '500' },

  // ── Profile card ──
  profileCard: {
    borderRadius: 20, padding: 18,
    flexDirection: 'row', alignItems: 'center',
    ...CARD_SHADOW,
  },
  profileAvatarWrap: {},
  profileAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  profileAvatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  profileName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  profileMeta: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  profileId: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },

  // ── Attendance card ──
  card: {
    borderRadius: 18, padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    ...CARD_SHADOW,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSub: { fontSize: 12 },
  timeRow: { flexDirection: 'row', gap: 0 },
  timeCol: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  timeLabel: { fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  timeValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  checkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14,
  },
  checkBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  doneRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', padding: 12, borderRadius: 12,
  },

  // ── Quick grid ──
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: (SW - 32 - 10) / 2,
    borderRadius: 16, padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start', gap: 10,
    ...CARD_SHADOW,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '600' },

  // ── Payslip card ──
  payCard: {
    borderRadius: 18, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    ...CARD_SHADOW,
  },
  payMonth: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  payNetLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  payAmount: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 2, letterSpacing: -0.5 },
  // ── Leave balance ──
  leaveRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  leaveType: { fontSize: 13, fontWeight: '600' },
  leaveMeta: { fontSize: 11, marginTop: 2 },
  leaveRemaining: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  leaveDaysLabel: { fontSize: 10, marginTop: 1 },

  // ── Recent requests ──
  reqList: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  reqRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  reqType: { fontSize: 13, fontWeight: '500' },
  reqDate: { fontSize: 11, marginTop: 2 },
});
