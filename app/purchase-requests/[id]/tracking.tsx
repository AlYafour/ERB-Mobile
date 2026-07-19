import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppSkeletonList } from '@/components/ui/AppSkeleton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh';
import { baseDetailStyles } from '@/lib/utils/detail-styles';

type AppColors = typeof Colors.light | typeof Colors.dark;

const STAGE_ICONS: Record<string, any> = {
  pr_created: 'doc.text.fill',
  pr_approved: 'checkmark.circle.fill',
  pr_rejected: 'xmark.circle.fill',
  pr_pending: 'clock.fill',
  quotation_request_issued: 'quote.bubble.fill',
  purchase_quotation_received: 'dollarsign.circle.fill',
  supplier_awarded: 'checkmark.seal.fill',
  lpo_created: 'cart.fill',
  lpo_pending: 'clock.fill',
  lpo_approved: 'checkmark.circle.fill',
  lpo_rejected: 'xmark.circle.fill',
  lpo_completed: 'checkmark.circle.fill',
  grn_created: 'shippingbox.fill',
  invoice_created: 'doc.fill',
  invoice_approved: 'checkmark.circle.fill',
  invoice_paid: 'dollarsign.circle.fill',
};

interface TimelineItem {
  stage: string;
  stage_name: string;
  status: 'completed' | 'in_progress' | 'pending' | 'rejected';
  user: string | null;
  user_role: string | null;
  timestamp: string | null;
  duration: string | null;
  notes: string | null;
  documents: { type: string; url: string; name: string }[];
  related_id: number;
  related_type: string;
}

interface TrackingData {
  purchase_request: { id: number; code: string; title: string; status: string };
  timeline: TimelineItem[];
  current_stage: string;
  total_duration: string | null;
}

function getStatusColor(status: TimelineItem['status'], C: AppColors): string {
  switch (status) {
    case 'completed': return C.success;
    case 'rejected':  return C.danger;
    case 'in_progress': return C.primary;
    case 'pending':   return C.textMuted;
  }
}

function getStatusBg(status: TimelineItem['status'], C: AppColors): string {
  switch (status) {
    case 'completed': return C.successBg;
    case 'rejected':  return C.dangerBg;
    case 'in_progress': return C.primarySoft;
    case 'pending':   return C.surfaceSoft;
  }
}

function getStatusLabel(status: TimelineItem['status']): string {
  switch (status) {
    case 'completed': return 'Done';
    case 'rejected':  return 'Rejected';
    case 'in_progress': return 'Active';
    case 'pending':   return 'Pending';
  }
}

function getRelatedRoute(type: string, relatedId: number): string {
  const map: Record<string, string> = {
    purchase_request:   `/purchase-requests/${relatedId}`,
    quotation_request:  `/quotation-requests/${relatedId}`,
    purchase_quotation: `/purchase-quotations/${relatedId}`,
    purchase_order:     `/purchase-orders/${relatedId}`,
    goods_receiving:    `/goods-receiving/${relatedId}`,
    purchase_invoice:   `/purchase-invoices/${relatedId}`,
  };
  return map[type] || '#';
}

function PurchaseRequestTrackingScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await purchaseRequestsApi.getTrackingTimeline(id);
      setData(result);
    } catch (e: any) {
      setError(e.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };
  const pullToRefresh = usePullToRefresh(refreshing, onRefresh);

  const S = makeStyles(C);

  if (loading) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Workflow Tracking" showBack />
      <AppSkeletonList count={3} lines={4} />
    </SafeAreaView>
  );

  if (error || !data) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Workflow Tracking" showBack />
      <View style={S.center}>
        <AppEmptyState
          variant="error"
          title="Failed to load"
          message={error || 'Could not load the workflow timeline.'}
          actionLabel="Try Again"
          onAction={() => { setLoading(true); load(); }}
        />
      </View>
    </SafeAreaView>
  );

  const { purchase_request: pr, timeline, total_duration } = data;
  const completedCount = timeline.filter((t) => t.status === 'completed').length;
  const progress = timeline.length > 0 ? completedCount / timeline.length : 0;

  return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader
        title="Workflow Tracking"
        subtitle={pr.code}
        showBack
      />
      <ScrollView
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
        refreshControl={pullToRefresh}
      >

        {/* Summary card */}
        <AppCard style={S.card}>
          <View style={S.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={[S.prCode, { color: C.primary }]}>{pr.code}</Text>
              <Text style={[S.prTitle, { color: C.textPrimary }]} numberOfLines={2}>
                {pr.title}
              </Text>
            </View>
            {total_duration ? (
              <View style={S.durationBox}>
                <Text style={[S.durationLabel, { color: C.textMuted }]}>DURATION</Text>
                <Text style={[S.durationValue, { color: C.textPrimary }]}>{total_duration}</Text>
              </View>
            ) : null}
          </View>

          {/* Progress bar */}
          <View style={S.progressRow}>
            <View style={[S.progressBar, { backgroundColor: C.divider }]}>
              <View style={[S.progressFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: C.success }]} />
            </View>
            <Text style={[S.progressText, { color: C.textSecondary }]}>
              {completedCount}/{timeline.length} steps
            </Text>
          </View>
        </AppCard>

        {/* Timeline */}
        {timeline.length === 0 ? (
          <AppEmptyState
            variant="empty"
            icon="list.bullet"
            title="No timeline data"
            message="The workflow timeline for this request is not available yet."
          />
        ) : (
          <View style={S.timeline}>
            {timeline.map((item, i) => {
              const color = getStatusColor(item.status, C);
              const bg = getStatusBg(item.status, C);
              const icon = STAGE_ICONS[item.stage] || 'circle';
              const isLast = i === timeline.length - 1;

              return (
                <View key={i} style={S.timelineItem}>
                  {/* Connector */}
                  {!isLast ? (
                    <View style={[S.connector, { backgroundColor: item.status === 'completed' ? C.success : C.divider }]} />
                  ) : null}

                  {/* Dot */}
                  <View style={[S.dot, { backgroundColor: color, borderColor: C.background }]}>
                    <IconSymbol name={icon} size={11} color="#FFF" />
                  </View>

                  {/* Card */}
                  <AppCard
                    noPadding
                    style={[S.timelineCard, { borderLeftColor: color, backgroundColor: bg }]}
                    shadow={false}
                  >
                    <View style={S.cardPad}>
                      {/* Stage name + status pill */}
                      <View style={S.cardHeader}>
                        <Text style={[S.stageName, { color, flex: 1 }]}>{item.stage_name}</Text>
                        <View style={[S.statusPill, { backgroundColor: color }]}>
                          <Text style={S.statusPillText}>{getStatusLabel(item.status)}</Text>
                        </View>
                      </View>

                      {/* Actor */}
                      {item.user ? (
                        <View style={S.metaRow}>
                          <IconSymbol name="person.fill" size={11} color={C.textSecondary} />
                          <Text style={[S.metaText, { color: C.textSecondary }]}>
                            {item.user}{item.user_role ? ` · ${item.user_role.replace(/_/g, ' ')}` : ''}
                          </Text>
                        </View>
                      ) : null}

                      {/* Timestamp */}
                      {item.timestamp ? (
                        <View style={S.metaRow}>
                          <IconSymbol name="clock.fill" size={11} color={C.textSecondary} />
                          <Text style={[S.metaText, { color: C.textSecondary }]}>
                            {new Date(item.timestamp).toLocaleString('en-AE', {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      ) : null}

                      {/* Duration */}
                      {item.duration ? (
                        <View style={S.metaRow}>
                          <IconSymbol name="arrow.clockwise" size={11} color={C.textSecondary} />
                          <Text style={[S.metaText, { color: C.textSecondary }]}>{item.duration}</Text>
                        </View>
                      ) : null}

                      {/* Notes / rejection reason */}
                      {item.notes ? (
                        <View style={[S.notesBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                          <Text style={[S.notesText, { color: C.textPrimary }]}>{item.notes}</Text>
                        </View>
                      ) : null}

                      {/* Attached documents */}
                      {item.documents && item.documents.length > 0 ? (
                        <View style={S.docsRow}>
                          {item.documents.map((doc, di) => (
                            <TouchableOpacity
                              key={di}
                              onPress={() => Linking.openURL(doc.url)}
                              style={[S.docChip, { backgroundColor: C.surface, borderColor: C.border }]}
                            >
                              <IconSymbol name="paperclip" size={11} color={C.primary} />
                              <Text style={[S.docName, { color: C.primary }]} numberOfLines={1}>
                                {doc.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}

                      {/* Related record link */}
                      {item.related_id > 0 ? (
                        <TouchableOpacity
                          onPress={() => router.push(getRelatedRoute(item.related_type, item.related_id) as any)}
                          style={[S.viewDetails, { borderTopColor: C.divider }]}
                        >
                          <Text style={[S.viewDetailsText, { color: C.primary }]}>View Details →</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </AppCard>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    ...baseDetailStyles(C),
    card: { marginBottom: 16 },

    // Summary card
    summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    prCode: { fontSize: 13, fontWeight: '700', marginBottom: 4, letterSpacing: -0.1 },
    prTitle: { fontSize: 14, lineHeight: 20 },
    durationBox: { alignItems: 'flex-end' },
    durationLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    durationValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    progressText: { fontSize: 12, fontWeight: '600', minWidth: 60, textAlign: 'right' },

    // Timeline
    timeline: { paddingLeft: 20 },
    timelineItem: { position: 'relative', marginBottom: 16 },
    connector: { position: 'absolute', left: -13, top: 26, width: 2, bottom: -16 },
    dot: {
      position: 'absolute', left: -20, top: 12,
      width: 18, height: 18, borderRadius: 9,
      alignItems: 'center', justifyContent: 'center',
      zIndex: 2, borderWidth: 2,
    },
    timelineCard: { borderLeftWidth: 3, marginLeft: 8 },
    cardPad: { padding: 14 },

    // Card content
    cardHeader: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: 8, gap: 8,
    },
    stageName: { fontSize: 14, fontWeight: '700' },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    statusPillText: {
      fontSize: 10, color: '#FFF', fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.4,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    metaText: { fontSize: 12, flex: 1 },
    notesBox: { marginTop: 8, padding: 10, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
    notesText: { fontSize: 13, lineHeight: 19 },
    docsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    docChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 6, borderWidth: 1, maxWidth: 160,
    },
    docName: { fontSize: 11, flex: 1 },
    viewDetails: { marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
    viewDetailsText: { fontSize: 13, fontWeight: '600' },
  });
}


export default function PurchaseRequestTrackingScreen() {
  return (
    <AppPermissionGate category="purchase_request" action="view">
      <PurchaseRequestTrackingScreenInner />
    </AppPermissionGate>
  );
}
