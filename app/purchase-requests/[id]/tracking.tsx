import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

const C = Colors.light;

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

const STATUS_COLOR: Record<string, string> = {
  completed: C.success,
  in_progress: C.tint,
  pending: C.textTertiary,
  rejected: C.error,
};

const STATUS_BG: Record<string, string> = {
  completed: C.successLight,
  in_progress: C.tintSubtle,
  pending: C.backgroundSecondary,
  rejected: C.errorLight,
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
  documents: Array<{ type: string; url: string; name: string }>;
  related_id: number;
  related_type: string;
}

interface TrackingData {
  purchase_request: { id: number; code: string; title: string; status: string };
  timeline: TimelineItem[];
  current_stage: string;
  total_duration: string | null;
}

function getRelatedRoute(type: string, relatedId: number): string {
  const map: Record<string, string> = {
    purchase_request: `/purchase-requests/${relatedId}`,
    quotation_request: `/quotation-requests/${relatedId}`,
    purchase_quotation: `/purchase-quotations/${relatedId}`,
    purchase_order: `/purchase-orders/${relatedId}`,
    goods_receiving: `/goods-receiving/${relatedId}`,
    purchase_invoice: `/purchase-invoices/${relatedId}`,
  };
  return map[type] || '#';
}

export default function PurchaseRequestTrackingScreen() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    purchaseRequestsApi.getTrackingTimeline(id)
      .then(setData)
      .catch((e: any) => setError(e.message || 'Failed to load timeline'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Workflow Tracking" showBack />
      <View style={S.center}><ActivityIndicator size="large" color={C.tint} /></View>
    </SafeAreaView>
  );

  if (error || !data) return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Workflow Tracking" showBack />
      <View style={S.center}><Text style={S.errorText}>{error || 'Error loading timeline'}</Text></View>
    </SafeAreaView>
  );

  const { purchase_request: pr, timeline, total_duration } = data;
  const completedCount = timeline.filter(t => t.status === 'completed').length;
  const progress = timeline.length > 0 ? completedCount / timeline.length : 0;

  return (
    <SafeAreaView style={S.container} edges={['bottom']}>
      <ScreenHeader title="Workflow Tracking" subtitle={pr.code} showBack />
      <ScrollView contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>

        {/* Summary card */}
        <Card padding={16} style={S.card}>
          <View style={S.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={S.prCode}>{pr.code}</Text>
              <Text style={S.prTitle} numberOfLines={2}>{pr.title}</Text>
            </View>
            <View style={S.durationBox}>
              <Text style={S.durationLabel}>Duration</Text>
              <Text style={S.durationValue}>{total_duration || '—'}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={S.progressRow}>
            <View style={S.progressBar}>
              <View style={[S.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={S.progressText}>{completedCount}/{timeline.length} steps</Text>
          </View>
        </Card>

        {/* Timeline */}
        <View style={S.timeline}>
          {timeline.map((item, i) => {
            const color = STATUS_COLOR[item.status] || C.textTertiary;
            const bg = STATUS_BG[item.status] || C.backgroundSecondary;
            const icon = STAGE_ICONS[item.stage] || 'circle';
            const isLast = i === timeline.length - 1;

            return (
              <View key={i} style={S.timelineItem}>
                {/* Connector line */}
                {!isLast && <View style={[S.connector, { backgroundColor: item.status === 'completed' ? C.success : C.borderLight }]} />}

                {/* Dot */}
                <View style={[S.dot, { backgroundColor: color }]}>
                  <IconSymbol name={icon} size={12} color="#FFF" />
                </View>

                {/* Card */}
                <Card padding={14} style={[S.timelineCard, { borderLeftColor: color, backgroundColor: bg }]}>
                  <View style={S.cardHeader}>
                    <Text style={[S.stageName, { color }]}>{item.stage_name}</Text>
                    <View style={[S.statusPill, { backgroundColor: color }]}>
                      <Text style={S.statusPillText}>{item.status.replace('_', ' ')}</Text>
                    </View>
                  </View>

                  {item.user && (
                    <View style={S.metaRow}>
                      <IconSymbol name="person.fill" size={12} color={C.textSecondary} />
                      <Text style={S.metaText}>{item.user}{item.user_role ? ` · ${item.user_role.replace(/_/g, ' ')}` : ''}</Text>
                    </View>
                  )}
                  {item.timestamp && (
                    <View style={S.metaRow}>
                      <IconSymbol name="clock.fill" size={12} color={C.textSecondary} />
                      <Text style={S.metaText}>{new Date(item.timestamp).toLocaleString('en-AE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  )}
                  {item.duration && (
                    <View style={S.metaRow}>
                      <IconSymbol name="arrow.clockwise" size={12} color={C.textSecondary} />
                      <Text style={S.metaText}>{item.duration}</Text>
                    </View>
                  )}
                  {item.notes && (
                    <View style={S.notesBox}>
                      <Text style={S.notesText}>{item.notes}</Text>
                    </View>
                  )}
                  {item.documents && item.documents.length > 0 && (
                    <View style={S.docsRow}>
                      {item.documents.map((doc, di) => (
                        <TouchableOpacity key={di} onPress={() => Linking.openURL(doc.url)} style={S.docChip}>
                          <IconSymbol name="paperclip" size={11} color={C.tint} />
                          <Text style={S.docName} numberOfLines={1}>{doc.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {item.related_id > 0 && (
                    <TouchableOpacity onPress={() => router.push(getRelatedRoute(item.related_type, item.related_id) as any)} style={S.viewDetails}>
                      <Text style={S.viewDetailsText}>View Details →</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              </View>
            );
          })}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, color: C.error },
  content: { padding: 16, paddingBottom: 24 },
  card: { marginBottom: 16 },

  // Summary
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  prCode: { fontSize: 13, fontWeight: '700', color: C.tint, marginBottom: 4 },
  prTitle: { fontSize: 14, color: C.text, lineHeight: 20 },
  durationBox: { alignItems: 'flex-end' },
  durationLabel: { fontSize: 10, color: C.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  durationValue: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: { flex: 1, height: 6, backgroundColor: C.borderLight, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.success, borderRadius: 3 },
  progressText: { fontSize: 12, color: C.textSecondary, fontWeight: '600', minWidth: 60, textAlign: 'right' },

  // Timeline
  timeline: { paddingLeft: 20 },
  timelineItem: { position: 'relative', marginBottom: 16 },
  connector: { position: 'absolute', left: -13, top: 28, width: 2, bottom: -16 },
  dot: { position: 'absolute', left: -20, top: 14, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', zIndex: 2, borderWidth: 2, borderColor: C.background },
  timelineCard: { borderLeftWidth: 3, marginLeft: 8 },

  // Card content
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  stageName: { fontSize: 14, fontWeight: '700', flex: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPillText: { fontSize: 10, color: '#FFF', fontWeight: '600', textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { fontSize: 12, color: C.textSecondary },
  notesBox: { marginTop: 8, padding: 8, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 6 },
  notesText: { fontSize: 12, color: C.text, lineHeight: 18 },
  docsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  docChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.card, borderRadius: 6, borderWidth: 1, borderColor: C.border, maxWidth: 160 },
  docName: { fontSize: 11, color: C.tint, flex: 1 },
  viewDetails: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' },
  viewDetailsText: { fontSize: 13, color: C.tint, fontWeight: '600' },
});
