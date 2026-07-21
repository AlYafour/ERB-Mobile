import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  RefreshControl, Modal, TextInput, ScrollView, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge, BadgeVariant } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppFilterBar } from '@/components/ui/AppFilterBar';
import { AppSkeletonList } from '@/components/ui/AppSkeleton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import RejectionReasonDialog from '@/components/ui/RejectionReasonDialog';
import { Colors, ModuleTints, CARD_SHADOW } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hrRequestsApi, HRRequest, HRLeaveBalance } from '@/lib/api/hr';
import { toast, confirm } from '@/lib/hooks/use-toast';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';
import { useMyEmployeeProfile } from '@/lib/hooks/use-employee-profile';

type PendingAttachment = { uri: string; type: string; name: string };

// Icons must exist in components/ui/icon-symbol.tsx MAPPING — unmapped names
// silently render as an empty circle on Android.
const REQUEST_TYPES = [
  { value: 'annual_leave',    label: 'Annual Leave',        icon: 'sun.max.fill',                 tint: 'hr' as const },
  { value: 'sick_leave',      label: 'Sick Leave',          icon: 'cross.case.fill',              tint: 'operations' as const },
  { value: 'emergency_leave', label: 'Emergency Leave',     icon: 'exclamationmark.triangle.fill', tint: 'finance' as const },
  { value: 'unpaid_leave',    label: 'Unpaid Leave',        icon: 'calendar.badge.minus',         tint: 'operations' as const },
  { value: 'work_from_home',  label: 'Work From Home',      icon: 'laptopcomputer',               tint: 'procurement' as const },
  { value: 'overtime',        label: 'Overtime',            icon: 'clock.badge.plus',             tint: 'procurement' as const },
  { value: 'advance_salary',  label: 'Advance Salary',      icon: 'banknote.fill',                tint: 'finance' as const },
  { value: 'document_request',label: 'Document / HR Letter',icon: 'doc.text',                     tint: 'admin' as const },
  { value: 'other',           label: 'Other',               icon: 'ellipsis.circle',              tint: 'operations' as const },
];

function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    case 'pending':  return 'warning';
    default:         return 'default';
  }
}

type AppColors = typeof Colors.light | typeof Colors.dark;

// FlashList ignores `gap` in contentContainerStyle — spacing via separator.
const ListGap = () => <View style={{ height: 12 }} />;

export default function HRRequestsScreen() {
  const { employeeId, loading: profileLoading } = useMyEmployeeProfile();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const insets = useSafeAreaInsets();
  const { type: typeParam } = useLocalSearchParams<{ type?: string }>();

  // Permission-based, matching the web (hr/requests/page.tsx):
  // approve/reject/view-all come from the permission system, not the
  // old hardcoded hr_manager/super_admin role check.
  const { hasPermission } = usePermissions();
  const canApproveReq = hasPermission('hr_request', 'approve');
  const canRejectReq = hasPermission('hr_request', 'reject');
  const canViewAll = hasPermission('hr_request', 'view');

  // First load fills the screen; later reloads (filter/toggle taps) keep the
  // list mounted and only show the slim inline indicator.
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<HRLeaveBalance[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [rejectDialogId, setRejectDialogId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [viewAll, setViewAll] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [form, setForm] = useState({
    request_type: 'annual_leave',
    start_date: '',
    end_date: '',
    days: '',
    reason: '',
  });

  // Attachments picked in the New Request form, uploaded right after create()
  // succeeds (the backend needs the request's id first — same two-step
  // pattern as the Expenses module's receipt uploads).
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const pickAttachment = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { toast('Please allow photo library access to attach a document', 'error'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.7,
    });
    if (result.canceled || !result.assets.length) return;
    setPendingAttachments(prev => [
      ...prev,
      ...result.assets.map((a, i) => ({
        uri: a.uri,
        type: a.mimeType || 'image/jpeg',
        name: a.fileName || `attachment-${Date.now()}-${i}.jpg`,
      })),
    ]);
  };

  const removePendingAttachment = (uri: string) => {
    setPendingAttachments(prev => prev.filter(a => a.uri !== uri));
  };

  const handledTypeParam = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (typeParam && typeParam !== handledTypeParam.current) {
      handledTypeParam.current = typeParam;
      if (REQUEST_TYPES.find(t => t.value === typeParam)) {
        setForm(f => ({ ...f, request_type: typeParam }));
        setShowForm(true);
      }
    }
  }, [typeParam]);

  // Concurrency guards:
  // - reqSeq: monotonically increasing token; an older response can never
  //   overwrite a newer one (rapid filter taps used to race out of order).
  // - mountedRef: no setState after the screen is closed.
  const reqSeq = useRef(0);
  const mountedRef = useRef(true);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Employee-record resolution now lives in useMyEmployeeProfile — this
  // loader only fetches the requests page(s) + leave balances once that
  // employee id (or the manager's view-all permission) is known.
  const loadData = useCallback(async (pg = 1, append = false) => {
    if (profileLoading) return;
    const seq = ++reqSeq.current;
    if (append) setLoadingMore(true);
    else if (hasLoadedOnce.current) setListLoading(true);
    try {
      if (employeeId == null && !canViewAll) {
        if (seq === reqSeq.current && mountedRef.current) {
          setInitialLoading(false); setRefreshing(false); setListLoading(false); setLoadingMore(false);
        }
        return;
      }

      const params: any = { page: pg };
      if (!viewAll && employeeId != null) params.employee = employeeId;
      if (filterStatus) params.status = filterStatus;

      if (append) {
        const res = await hrRequestsApi.getAll(params);
        if (seq !== reqSeq.current || !mountedRef.current) return;
        setRequests(prev => [...prev, ...(res.results ?? [])]);
        setHasMore(!!res.next);
        setPage(pg);
      } else {
        const [reqRes, balanceRes] = await Promise.allSettled([
          hrRequestsApi.getAll(params),
          employeeId != null
            ? hrRequestsApi.getLeaveBalances(employeeId, new Date().getFullYear())
            : Promise.resolve([]),
        ]);

        if (seq !== reqSeq.current || !mountedRef.current) return;
        if (reqRes.status === 'fulfilled') {
          setRequests(reqRes.value.results ?? []);
          setHasMore(!!reqRes.value.next);
          setPage(pg);
        }
        if (balanceRes.status === 'fulfilled') setLeaveBalances(balanceRes.value as HRLeaveBalance[]);
      }
      hasLoadedOnce.current = true;
    } catch (e: any) {
      if (seq === reqSeq.current && mountedRef.current) {
        toast(e.message || 'Failed to load', 'error');
      }
    } finally {
      if (seq === reqSeq.current && mountedRef.current) {
        setInitialLoading(false);
        setListLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [employeeId, profileLoading, filterStatus, viewAll, canViewAll]);

  useEffect(() => { loadData(); }, [loadData]);
  // Stale-list fix: refetch when the screen regains focus
  useRefetchOnFocus(loadData);
  const handleRefresh = () => { setRefreshing(true); loadData(1); };
  const handleLoadMore = () => { if (hasMore && !loadingMore && !listLoading) loadData(page + 1, true); };

  const handleSubmit = async () => {
    if (!employeeId) { toast('No employee profile linked', 'error'); return; }
    if (!form.reason.trim()) { toast('Please enter a reason', 'error'); return; }
    setSubmitting(true);
    try {
      const created = await hrRequestsApi.create({
        employee: employeeId,
        request_type: form.request_type,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        days: form.days ? Number(form.days) : undefined,
        reason: form.reason,
      });

      // Upload sequentially — the backend needs the request's own id first,
      // so this can only happen after create() resolves.
      let failedUploads = 0;
      for (const att of pendingAttachments) {
        try {
          await hrRequestsApi.uploadAttachment(created.id, att);
        } catch {
          failedUploads++;
        }
      }

      setShowForm(false);
      setForm({ request_type: 'annual_leave', start_date: '', end_date: '', days: '', reason: '' });
      setPendingAttachments([]);
      toast(
        failedUploads > 0
          ? `Request submitted, but ${failedUploads} attachment${failedUploads > 1 ? 's' : ''} failed to upload`
          : 'Request submitted successfully',
        failedUploads > 0 ? 'warning' : 'success',
      );
      loadData();
    } catch (e: any) {
      toast(e.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!await confirm('Approve this HR request?')) return;
    setApproving(id);
    try {
      await hrRequestsApi.approve(id);
      toast('Request approved', 'success');
      loadData();
    } catch (e: any) {
      toast(e.message || 'Failed to approve', 'error');
    } finally {
      setApproving(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectDialogId) return;
    const id = rejectDialogId;
    setRejectingId(id);
    try {
      await hrRequestsApi.reject(id, reason);
      toast('Request rejected', 'info');
      setRejectDialogId(null);
      loadData();
    } catch (e: any) {
      toast(e.message || 'Failed to reject', 'error');
    } finally {
      setRejectingId(null);
    }
  };

  const annualBalance = leaveBalances.find(b =>
    b.leave_type?.toLowerCase().includes('annual')
  );

  const S = makeStyles(C);

  const renderItem = ({ item }: { item: HRRequest }) => {
    const typeDef = REQUEST_TYPES.find(t => t.value === item.request_type);
    const typeLabel = typeDef?.label || item.request_type;
    const tint = ModuleTints[cs][typeDef?.tint ?? 'operations'];
    const isApprovable = item.status === 'pending' && (canApproveReq || canRejectReq);

    return (
      <View style={S.reqCard}>
        <View style={S.reqHeader}>
          <View style={[S.typeTile, { backgroundColor: tint.bg }]}>
            <IconSymbol name={(typeDef?.icon ?? 'doc.text') as any} size={17} color={tint.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[S.reqType, { color: C.textPrimary }]}>{typeLabel}</Text>
            {viewAll && item.employee_name ? (
              <Text style={[S.reqEmployee, { color: C.textMuted }]}>{item.employee_name}</Text>
            ) : null}
          </View>
          <AppBadge variant={getStatusVariant(item.status)}>
            {item.status.toUpperCase()}
          </AppBadge>
        </View>

        {(item.start_date || item.end_date) && (
          <View style={S.dateRow}>
            <IconSymbol name="calendar" size={13} color={C.textMuted} />
            <Text style={[S.reqDates, { color: C.textSecondary }]}>
              {item.start_date
                ? new Date(item.start_date).toLocaleDateString('en-AE', { month: 'short', day: 'numeric', year: 'numeric' })
                : ''}
              {item.end_date && item.start_date !== item.end_date
                ? ` → ${new Date(item.end_date).toLocaleDateString('en-AE', { month: 'short', day: 'numeric' })}`
                : ''}
              {item.days ? ` · ${item.days} day${Number(item.days) !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>
        )}

        {item.reason ? (
          <Text style={[S.reqReason, { color: C.textSecondary }]} numberOfLines={2}>{item.reason}</Text>
        ) : null}

        {item.attachments?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {item.attachments.map(att => (
                <TouchableOpacity key={att.id} onPress={() => setViewerUri(att.url)} activeOpacity={0.85}>
                  <Image source={{ uri: att.url }} style={S.attachmentThumbSmall} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : null}

        {item.reject_reason ? (
          <View style={[S.rejectBox, { backgroundColor: C.dangerBg, borderColor: C.danger }]}>
            <Text style={[S.rejectLabel, { color: C.danger }]}>Rejection Reason</Text>
            <Text style={[S.rejectText, { color: C.danger }]}>{item.reject_reason}</Text>
          </View>
        ) : null}

        {item.approver_name && item.status !== 'pending' ? (
          <Text style={[S.approvedBy, { color: C.textMuted }]}>
            {item.status === 'approved' ? 'Approved' : 'Reviewed'} by {item.approver_name}
          </Text>
        ) : null}

        <Text style={[S.submittedAt, { color: C.textMuted }]}>
          {new Date(item.created_at).toLocaleDateString('en-AE', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>

        {isApprovable && (
          <View style={S.actionRow}>
            {canApproveReq && (
              <AppButton
                title="Approve"
                variant="successOutline"
                size="sm"
                onPress={() => handleApprove(item.id)}
                loading={approving === item.id}
                disabled={approving === item.id || rejectingId === item.id}
                style={{ flex: 1 }}
              />
            )}
            {canRejectReq && (
              <AppButton
                title="Reject"
                variant="dangerOutline"
                size="sm"
                onPress={() => setRejectDialogId(item.id)}
                disabled={approving === item.id || rejectingId === item.id}
                style={{ flex: 1 }}
              />
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[S.root, { backgroundColor: C.background }]} edges={['top']}>
      <AppHeader
        title="HR Requests"
        showBack
        right={
          employeeId ? (
            <TouchableOpacity
              style={[S.newBtn, { backgroundColor: C.primary }]}
              onPress={() => setShowForm(true)}
              activeOpacity={0.8}
            >
              <IconSymbol name="plus" size={13} color={C.primaryText} />
              <Text style={[S.newBtnText, { color: C.primaryText }]}>New</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Leave balance strip */}
      {annualBalance && (
        <View style={[S.balanceStrip, { backgroundColor: C.primarySoft }]}>
          <IconSymbol name="calendar" size={14} color={C.primary} />
          <Text style={[S.balanceText, { color: C.primary }]}>
            Annual Leave:{' '}
            <Text style={{ fontWeight: '700' }}>{annualBalance.remaining_days} days</Text> remaining
          </Text>
        </View>
      )}

      {/* Manager toggle — my vs all (hr_request.view permission, like the web) */}
      {canViewAll && (
        <AppFilterBar
          variant="segmented"
          options={[
            { key: false, label: 'My Requests' },
            { key: true,  label: 'All Requests' },
          ]}
          value={viewAll}
          onChange={setViewAll}
          loading={listLoading && !refreshing}
        />
      )}

      {/* Status filter chips */}
      <AppFilterBar
        options={[
          { key: '',         label: 'All' },
          { key: 'pending',  label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
        ]}
        value={filterStatus}
        onChange={setFilterStatus}
        loading={listLoading && !refreshing}
      />

      {profileLoading || initialLoading ? (
        <AppSkeletonList count={4} lines={3} />
      ) : requests.length === 0 ? (
        <AppEmptyState
          variant="empty"
          icon="calendar.badge.clock"
          title="No requests"
          message={filterStatus ? `No ${filterStatus} requests found.` : 'No HR requests yet.'}
        />
      ) : (
        <FlashList
          data={requests}
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

      {/* ── New Request Modal ── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[S.modal, { backgroundColor: C.background }]}>
          <View style={[S.modalHeader, { borderBottomColor: C.border }]}>
            <Text style={[S.modalTitle, { color: C.textPrimary }]}>New Request</Text>
            <TouchableOpacity onPress={() => { setShowForm(false); setPendingAttachments([]); }} hitSlop={8}>
              <IconSymbol name="xmark.circle.fill" size={26} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={S.modalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Request type */}
            <Text style={[S.formLabel, { color: C.textPrimary }]}>Request Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {REQUEST_TYPES.map(rt => (
                  <TouchableOpacity
                    key={rt.value}
                    style={[S.typeChip, {
                      backgroundColor: form.request_type === rt.value ? C.primary : C.surface,
                      borderColor:     form.request_type === rt.value ? C.primary : C.border,
                    }]}
                    onPress={() => setForm(f => ({ ...f, request_type: rt.value }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.request_type === rt.value }}
                  >
                    <IconSymbol
                      name={rt.icon as any}
                      size={14}
                      color={form.request_type === rt.value ? C.primaryText : C.textMuted}
                    />
                    <Text style={[S.typeChipText, {
                      color: form.request_type === rt.value ? C.primaryText : C.textSecondary,
                    }]}>
                      {rt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Start date */}
            <Text style={[S.formLabel, { color: C.textPrimary }]}>Start Date</Text>
            <TouchableOpacity
              style={[S.dateBtn, {
                backgroundColor: C.surface,
                borderColor: form.start_date ? C.primary : C.border,
              }]}
              onPress={() => setShowStartPicker(true)}
            >
              <IconSymbol name="calendar" size={16} color={form.start_date ? C.primary : C.textMuted} />
              <Text style={[S.dateBtnText, { color: form.start_date ? C.textPrimary : C.textMuted }]}>
                {form.start_date
                  ? new Date(form.start_date).toLocaleDateString('en-AE', { month: 'long', day: 'numeric', year: 'numeric' })
                  : 'Select start date'}
              </Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={form.start_date ? new Date(form.start_date) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (date) setForm(f => ({ ...f, start_date: date.toISOString().split('T')[0] }));
                }}
              />
            )}

            {/* End date */}
            <Text style={[S.formLabel, { color: C.textPrimary }]}>End Date</Text>
            <TouchableOpacity
              style={[S.dateBtn, {
                backgroundColor: C.surface,
                borderColor: form.end_date ? C.primary : C.border,
              }]}
              onPress={() => setShowEndPicker(true)}
            >
              <IconSymbol name="calendar" size={16} color={form.end_date ? C.primary : C.textMuted} />
              <Text style={[S.dateBtnText, { color: form.end_date ? C.textPrimary : C.textMuted }]}>
                {form.end_date
                  ? new Date(form.end_date).toLocaleDateString('en-AE', { month: 'long', day: 'numeric', year: 'numeric' })
                  : 'Select end date'}
              </Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={form.end_date ? new Date(form.end_date) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={form.start_date ? new Date(form.start_date) : undefined}
                onChange={(_, date) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (date) setForm(f => ({ ...f, end_date: date.toISOString().split('T')[0] }));
                }}
              />
            )}

            {/* Number of days */}
            <Text style={[S.formLabel, { color: C.textPrimary }]}>
              Number of Days{' '}
              <Text style={[S.formLabelOptional, { color: C.textMuted }]}>(optional)</Text>
            </Text>
            <TextInput
              style={[S.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
              placeholder="e.g. 3"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              value={form.days}
              onChangeText={v => setForm(f => ({ ...f, days: v }))}
            />

            {/* Reason */}
            <Text style={[S.formLabel, { color: C.textPrimary }]}>
              Reason <Text style={{ color: C.danger }}>*</Text>
            </Text>
            <TextInput
              style={[S.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
              placeholder="Describe your request..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={form.reason}
              onChangeText={v => setForm(f => ({ ...f, reason: v }))}
            />

            {/* Attachments — e.g. a sick-leave medical certificate */}
            <Text style={[S.formLabel, { color: C.textPrimary }]}>
              Attachments{' '}
              <Text style={[S.formLabelOptional, { color: C.textMuted }]}>(optional)</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {pendingAttachments.map(att => (
                  <TouchableOpacity
                    key={att.uri}
                    style={S.attachmentThumbWrap}
                    onPress={() => setViewerUri(att.uri)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: att.uri }} style={S.attachmentThumb} />
                    <TouchableOpacity
                      style={[S.attachmentRemove, { backgroundColor: C.danger }]}
                      onPress={() => removePendingAttachment(att.uri)}
                      hitSlop={8}
                    >
                      <IconSymbol name="xmark" size={11} color="#FFF" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[S.attachmentAdd, { borderColor: C.border, backgroundColor: C.surface }]}
                  onPress={pickAttachment}
                  activeOpacity={0.8}
                >
                  <IconSymbol name="paperclip" size={18} color={C.primary} />
                  <Text style={[S.attachmentAddText, { color: C.primary }]}>Add</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={{ height: 20 }} />
            <AppButton
              title="Submit Request"
              variant="primary"
              size="lg"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              fullWidth
            />
            <View style={{ height: insets.bottom + 24 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Rejection reason dialog */}
      <RejectionReasonDialog
        isOpen={rejectDialogId !== null}
        onClose={() => { if (!rejectingId) setRejectDialogId(null); }}
        onConfirm={handleRejectConfirm}
        loading={rejectingId !== null}
        title="Reject HR Request"
        message="Please provide a reason for rejecting this request."
      />

      {/* Attachment viewer — shared by the picker preview and submitted-request thumbnails */}
      <Modal visible={viewerUri !== null} animationType="fade" transparent onRequestClose={() => setViewerUri(null)}>
        <View style={S.viewerBackdrop}>
          <TouchableOpacity style={S.viewerClose} onPress={() => setViewerUri(null)} hitSlop={10}>
            <IconSymbol name="xmark.circle.fill" size={32} color="#FFF" />
          </TouchableOpacity>
          {viewerUri ? (
            <Image source={{ uri: viewerUri }} style={S.viewerImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    // gap intentionally absent — FlashList spacing comes from ListGap separator
    list: { padding: 16, paddingBottom: 32 },

    newBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    },
    newBtnText: { fontSize: 13, fontWeight: '600' },

    balanceStrip: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 16, paddingVertical: 10,
    },
    balanceText: { fontSize: 13 },

    toggleRow: {
      flexDirection: 'row', gap: 6,
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    toggleBtn: {
      flex: 1, alignItems: 'center',
      paddingVertical: 8, borderRadius: 10,
    },
    toggleBtnText: { fontSize: 13, fontWeight: '600' },
    controlDisabled: { opacity: 0.5 },

    chipsScroll: { maxHeight: 54 },
    chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
    chip: {
      paddingHorizontal: 16, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1,
    },
    chipText: { fontSize: 12, fontWeight: '600' },

    reqCard: {
      backgroundColor: C.surface,
      borderRadius: 16, padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.border,
      gap: 8,
      ...CARD_SHADOW,
    },
    reqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    typeTile: {
      width: 36, height: 36, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
    },
    reqType: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2, flex: 1 },
    reqEmployee: { fontSize: 12, marginTop: 2 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    reqDates: { fontSize: 13, flex: 1 },
    reqReason: { fontSize: 13, lineHeight: 19 },
    rejectBox: { padding: 10, borderRadius: 8, borderWidth: 1 },
    rejectLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
    rejectText: { fontSize: 13 },
    approvedBy: { fontSize: 11, fontStyle: 'italic' },
    submittedAt: { fontSize: 11 },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },

    modal: { flex: 1 },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
    modalBody: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
    formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
    formLabelOptional: { fontSize: 12, fontWeight: '400' },
    input: {
      borderRadius: 12, borderWidth: 1,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    },
    textarea: {
      borderRadius: 12, borderWidth: 1,
      paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 14, minHeight: 100,
    },
    dateBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderRadius: 12, borderWidth: 1,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    dateBtnText: { fontSize: 14, flex: 1 },
    typeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1,
    },
    typeChipText: { fontSize: 12, fontWeight: '600' },

    attachmentThumbSmall: { width: 56, height: 56, borderRadius: 8 },

    attachmentThumbWrap: { position: 'relative' },
    attachmentThumb: { width: 72, height: 72, borderRadius: 10 },
    attachmentRemove: {
      position: 'absolute', top: -6, right: -6,
      width: 20, height: 20, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    attachmentAdd: {
      width: 72, height: 72, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
      alignItems: 'center', justifyContent: 'center', gap: 4,
    },
    attachmentAddText: { fontSize: 11, fontWeight: '600' },

    viewerBackdrop: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
      alignItems: 'center', justifyContent: 'center',
    },
    viewerImage: { width: '100%', height: '80%' },
    viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 1 },
  });
}
