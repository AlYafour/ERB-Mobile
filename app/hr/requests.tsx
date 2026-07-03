import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hrRequestsApi, HRRequest, HRLeaveBalance } from '@/lib/api/hr';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';

const REQUEST_TYPES = [
  { value: 'annual_leave', label: 'Annual Leave' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'emergency_leave', label: 'Emergency Leave' },
  { value: 'unpaid_leave', label: 'Unpaid Leave' },
  { value: 'work_from_home', label: 'Work From Home' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'advance_salary', label: 'Advance Salary' },
  { value: 'document_request', label: 'Document Request' },
  { value: 'other', label: 'Other' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  cancelled: '#6b7280',
};

export default function HRRequestsScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { type: typeParam } = useLocalSearchParams<{ type?: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<HRLeaveBalance[]>([]);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [form, setForm] = useState({
    request_type: 'annual_leave',
    start_date: '',
    end_date: '',
    days: '',
    reason: '',
  });

  const handledTypeParam = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (typeParam && typeParam !== handledTypeParam.current) {
      handledTypeParam.current = typeParam;
      const valid = REQUEST_TYPES.find(t => t.value === typeParam);
      if (valid) {
        setForm(f => ({ ...f, request_type: typeParam }));
        setShowForm(true);
      }
    }
  }, [typeParam]);

  const loadData = useCallback(async () => {
    if (!user) { setLoading(false); setRefreshing(false); return; }
    try {
      const empRes = await apiClient.get<any>(API_ENDPOINTS.HR_EMPLOYEES);
      const employees: any[] = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.results ?? []);
      const me = employees.find(
        (e: any) => e.user?.id === Number(user?.id) || String(e.user?.id) === String(user?.id)
      );
      if (!me) { setLoading(false); setRefreshing(false); return; }
      setEmployeeId(me.id);

      const params: any = { employee: me.id };
      if (filterStatus) params.status = filterStatus;
      const res = await hrRequestsApi.getAll(params);
      setRequests(res.results ?? []);

      const year = new Date().getFullYear();
      const balances = await hrRequestsApi.getLeaveBalances(me.id, year);
      setLeaveBalances(balances);
    } catch (e) {
      console.error('HR requests load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const handleSubmit = async () => {
    if (!employeeId) return;
    if (!form.request_type) { Alert.alert('Error', 'Select a request type'); return; }
    if (!form.reason.trim()) { Alert.alert('Error', 'Please enter a reason'); return; }

    setSubmitting(true);
    try {
      await hrRequestsApi.create({
        employee: employeeId,
        request_type: form.request_type,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        days: form.days ? Number(form.days) : undefined,
        reason: form.reason,
      });
      setShowForm(false);
      setForm({ request_type: 'annual_leave', start_date: '', end_date: '', days: '', reason: '' });
      loadData();
      Alert.alert('Submitted', 'Your request has been submitted for approval.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: HRRequest }) => {
    const typeLabel = REQUEST_TYPES.find(t => t.value === item.request_type)?.label || item.request_type;
    const color = STATUS_COLORS[item.status] || '#6b7280';
    return (
      <View style={[s.reqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.reqHeader}>
          <Text style={[s.reqType, { color: colors.text }]}>{typeLabel}</Text>
          <View style={[s.badge, { backgroundColor: color + '22' }]}>
            <Text style={[s.badgeText, { color }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        {(item.start_date || item.end_date) && (
          <Text style={[s.reqDates, { color: colors.textSecondary }]}>
            {item.start_date && new Date(item.start_date).toLocaleDateString()}
            {item.end_date && item.start_date !== item.end_date && ` → ${new Date(item.end_date).toLocaleDateString()}`}
            {item.days && ` (${item.days} days)`}
          </Text>
        )}
        {item.reason ? (
          <Text style={[s.reqReason, { color: colors.textSecondary }]} numberOfLines={2}>{item.reason}</Text>
        ) : null}
        {item.reject_reason ? (
          <Text style={[s.rejectReason, { color: '#ef4444' }]}>Rejected: {item.reject_reason}</Text>
        ) : null}
        <Text style={[s.reqDate, { color: colors.textSecondary }]}>
          Submitted {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    );
  };

  const leaveBalance = leaveBalances.find(b => b.leave_type === 'Annual Leave' || b.leave_type === 'annual');

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title="My Requests"
        showBack
        rightElement={
          <TouchableOpacity
            style={[s.newBtn, { backgroundColor: colors.tint }]}
            onPress={() => setShowForm(true)}
          >
            <Text style={s.newBtnText}>+ New</Text>
          </TouchableOpacity>
        }
      />

      {/* Leave balance strip */}
      {leaveBalance && (
        <View style={[s.balanceStrip, { backgroundColor: colors.tint + '15', borderBottomColor: colors.border }]}>
          <Text style={[s.balanceText, { color: colors.tint }]}>
            Annual Leave: {leaveBalance.remaining_days} days remaining
          </Text>
        </View>
      )}

      {/* Status filter chips */}
      <View style={s.chips}>
        {['', 'pending', 'approved', 'rejected'].map(st => (
          <TouchableOpacity
            key={st}
            style={[s.chip, { borderColor: colors.border, backgroundColor: filterStatus === st ? colors.tint : colors.card }]}
            onPress={() => setFilterStatus(st)}
          >
            <Text style={[s.chipText, { color: filterStatus === st ? '#fff' : colors.text }]}>
              {st ? st.charAt(0).toUpperCase() + st.slice(1) : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.tint} /></View>
      ) : requests.length === 0 ? (
        <View style={s.center}>
          <IconSymbol name="calendar.badge.clock" size={40} color={colors.textSecondary} />
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>No requests yet</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />}
        />
      )}

      {/* New Request Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>New Request</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <IconSymbol name="xmark.circle.fill" size={26} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody}>
            <Text style={[s.label, { color: colors.text }]}>Request Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {REQUEST_TYPES.map(rt => (
                  <TouchableOpacity
                    key={rt.value}
                    style={[s.typeChip, { borderColor: colors.border, backgroundColor: form.request_type === rt.value ? colors.tint : colors.card }]}
                    onPress={() => setForm(f => ({ ...f, request_type: rt.value }))}
                  >
                    <Text style={[s.typeChipText, { color: form.request_type === rt.value ? '#fff' : colors.text }]}>{rt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[s.label, { color: colors.text }]}>Start Date</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={form.start_date}
              onChangeText={v => setForm(f => ({ ...f, start_date: v }))}
            />

            <Text style={[s.label, { color: colors.text }]}>End Date</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={form.end_date}
              onChangeText={v => setForm(f => ({ ...f, end_date: v }))}
            />

            <Text style={[s.label, { color: colors.text }]}>Number of Days</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 3"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              value={form.days}
              onChangeText={v => setForm(f => ({ ...f, days: v }))}
            />

            <Text style={[s.label, { color: colors.text }]}>Reason *</Text>
            <TextInput
              style={[s.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter reason..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={form.reason}
              onChangeText={v => setForm(f => ({ ...f, reason: v }))}
            />

            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: colors.tint, opacity: submitting ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Submit Request</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  balanceStrip: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  balanceText: { fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  list: { padding: 16, gap: 10 },
  reqCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 6 },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reqType: { fontSize: 14, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  reqDates: { fontSize: 12 },
  reqReason: { fontSize: 12 },
  rejectReason: { fontSize: 12, fontStyle: 'italic' },
  reqDate: { fontSize: 11, marginTop: 2 },
  newBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalBody: { padding: 16, gap: 4, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 10 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  textarea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, minHeight: 100, textAlignVertical: 'top' },
  typeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  typeChipText: { fontSize: 12, fontWeight: '500' },
  submitBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
