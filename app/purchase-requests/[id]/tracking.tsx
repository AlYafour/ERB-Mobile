import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseRequestsApi } from '@/lib/api/purchase-requests';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';

const statusColors: Record<string, string> = {
  completed: '#10B981',
  in_progress: '#F59E0B',
  pending: '#3B82F6',
  rejected: '#EF4444',
};

const statusBgColors: Record<string, string> = {
  completed: 'rgba(16, 185, 129, 0.1)',
  in_progress: 'rgba(245, 158, 11, 0.1)',
  pending: 'rgba(59, 130, 246, 0.1)',
  rejected: 'rgba(239, 68, 68, 0.1)',
};

const statusLabels: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  pending: 'Pending',
  rejected: 'Rejected',
};

const stageIcons: Record<string, string> = {
  pr_created: '📝',
  pr_approved: '✅',
  pr_rejected: '❌',
  pr_pending: '⏳',
  quotation_request_issued: '📋',
  purchase_quotation_received: '💰',
  supplier_awarded: '🏆',
  lpo_created: '📄',
  lpo_pending: '⏳',
  lpo_approved: '✅',
  lpo_rejected: '❌',
  lpo_completed: '✅',
  grn_created: '📦',
  invoice_created: '🧾',
  invoice_approved: '✅',
  invoice_paid: '💵',
};

const stageLabels: Record<string, string> = {
  pr_created: 'PR Created',
  pr_approved: 'PR Approved',
  pr_rejected: 'PR Rejected',
  pr_pending: 'PR Pending',
  quotation_request_issued: 'Quotation Request',
  purchase_quotation_received: 'Quotation Received',
  supplier_awarded: 'Supplier Awarded',
  lpo_created: 'LPO Created',
  lpo_pending: 'LPO Pending Approval',
  lpo_approved: 'LPO Approved',
  lpo_rejected: 'LPO Rejected',
  lpo_completed: 'LPO Completed',
  grn_created: 'GRN Created',
  invoice_created: 'Invoice Created',
  invoice_approved: 'Invoice Approved',
  invoice_paid: 'Invoice Paid',
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
  documents: Array<{
    type: string;
    url: string;
    name: string;
  }>;
  related_id: number;
  related_type: string;
}

interface TrackingData {
  purchase_request: {
    id: number;
    code: string;
    title: string;
    status: string;
  };
  timeline: TimelineItem[];
  current_stage: string;
  total_duration: string | null;
}

export default function PurchaseRequestTrackingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrackingData();
  }, [id]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await purchaseRequestsApi.getTrackingTimeline(id);
      setData(response);
    } catch (err: any) {
      console.error('Error loading tracking data:', err);
      setError(err.message || 'Failed to load tracking timeline');
    } finally {
      setLoading(false);
    }
  };

  const getRelatedUrl = (relatedType: string, relatedId: number): string => {
    switch (relatedType) {
      case 'purchase_request':
        return `/purchase-requests/${relatedId}`;
      case 'quotation_request':
        return `/quotation-requests/${relatedId}`;
      case 'purchase_quotation':
        return `/purchase-quotations/${relatedId}`;
      case 'purchase_order':
        return `/purchase-orders/${relatedId}`;
      case 'goods_receiving':
        return `/goods-receiving/${relatedId}`;
      case 'purchase_invoice':
        return `/purchase-invoices/${relatedId}`;
      default:
        return '#';
    }
  };

  const formatRole = (role: string | null): string => {
    if (!role) return '';
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <ThemedText style={styles.loadingText}>Loading timeline...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error || !data) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.errorCard}>
            <ThemedText style={styles.errorText}>
              {error || 'Error loading timeline. Please try again.'}
            </ThemedText>
            <Button
              title="Back to Purchase Request"
              variant="primary"
              onPress={() => router.back()}
              style={styles.backButton}
            />
          </Card>
        </ScrollView>
      </ThemedView>
    );
  }

  const { purchase_request, timeline, current_stage, total_duration } = data;
  const completedCount = timeline.filter(item => item.status === 'completed').length;
  const progressPercentage = timeline.length > 0 ? (completedCount / timeline.length) * 100 : 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Purchase Request Tracking
          </ThemedText>
        </View>

        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.codeContainer}>
                <ThemedText style={styles.codeText}>{purchase_request.code}</ThemedText>
              </View>
              <ThemedText style={styles.titleText}>{purchase_request.title}</ThemedText>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.statBox}>
                <ThemedText style={styles.statLabel}>Total Duration</ThemedText>
                <ThemedText style={styles.statValue}>{total_duration || 'N/A'}</ThemedText>
              </View>
              <View style={styles.statBox}>
                <ThemedText style={styles.statLabel}>Progress</ThemedText>
                <ThemedText style={styles.progressText}>
                  {completedCount} / {timeline.length}
                </ThemedText>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPercentage}%`, backgroundColor: Colors.light.success },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Timeline Section */}
        <Card style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <View style={styles.timelineIcon}>
              <ThemedText style={styles.timelineIconText}>📊</ThemedText>
            </View>
            <View>
              <ThemedText type="subtitle" style={styles.timelineTitle}>
                Procurement Workflow Timeline
              </ThemedText>
              <ThemedText style={styles.timelineSubtitle}>
                Complete tracking of all stages from creation to payment
              </ThemedText>
            </View>
          </View>

          {/* Timeline */}
          <View style={styles.timelineContainer}>
            {/* Timeline Line */}
            <View style={styles.timelineLine}>
              <View
                style={[
                  styles.timelineLineFill,
                  {
                    height: `${progressPercentage}%`,
                    backgroundColor: statusColors.completed,
                  },
                ]}
              />
            </View>

            {/* Timeline Items */}
            <View style={styles.timelineItems}>
              {timeline.map((item, index) => {
                const statusColor = statusColors[item.status] || statusColors.pending;
                const statusBg = statusBgColors[item.status] || statusBgColors.pending;

                return (
                  <View key={index} style={styles.timelineItem}>
                    {/* Timeline Dot */}
                    <View style={[styles.timelineDot, { backgroundColor: statusColor }]}>
                      <ThemedText style={styles.timelineDotNumber}>{index + 1}</ThemedText>
                    </View>

                    {/* Timeline Card */}
                    <Card style={[styles.timelineCardItem, { borderLeftColor: statusColor, backgroundColor: statusBg }]}>
                      {/* Card Header */}
                      <View style={styles.timelineCardHeader}>
                        <View style={styles.timelineCardLeft}>
                          <View style={styles.stageHeader}>
                            <ThemedText style={styles.stageIcon}>
                              {stageIcons[item.stage] || '📌'}
                            </ThemedText>
                            <ThemedText type="defaultSemiBold" style={styles.stageName}>
                              {item.stage_name}
                            </ThemedText>
                          </View>

                          {/* Metadata */}
                          <View style={styles.metadataContainer}>
                            {item.user && (
                              <View style={styles.metadataItem}>
                                <ThemedText style={styles.metadataIcon}>👤</ThemedText>
                                <View>
                                  <ThemedText style={styles.metadataLabel}>Performed By</ThemedText>
                                  <ThemedText style={styles.metadataValue}>
                                    {item.user}
                                    {item.user_role && (
                                      <ThemedText style={styles.metadataRole}>
                                        {' • '}
                                        {formatRole(item.user_role)}
                                      </ThemedText>
                                    )}
                                  </ThemedText>
                                </View>
                              </View>
                            )}

                            {item.timestamp && (
                              <View style={styles.metadataItem}>
                                <ThemedText style={styles.metadataIcon}>🕐</ThemedText>
                                <View>
                                  <ThemedText style={styles.metadataLabel}>Date & Time</ThemedText>
                                  <ThemedText style={styles.metadataValue}>
                                    {new Date(item.timestamp).toLocaleString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </ThemedText>
                                </View>
                              </View>
                            )}

                            {item.duration && (
                              <View style={styles.metadataItem}>
                                <ThemedText style={styles.metadataIcon}>⏱️</ThemedText>
                                <View>
                                  <ThemedText style={styles.metadataLabel}>Duration</ThemedText>
                                  <ThemedText style={[styles.metadataValue, { color: statusColor }]}>
                                    {item.duration}
                                  </ThemedText>
                                </View>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Status Badge */}
                        <View>
                          <Badge
                            style={[
                              styles.statusBadge,
                              { backgroundColor: statusColor },
                            ]}
                          >
                            {statusLabels[item.status] || item.status}
                          </Badge>
                        </View>
                      </View>

                      {/* Notes */}
                      {item.notes && (
                        <View style={styles.notesContainer}>
                          <ThemedText style={styles.notesLabel}>📝 Notes</ThemedText>
                          <ThemedText style={styles.notesText}>{item.notes}</ThemedText>
                        </View>
                      )}

                      {/* Documents */}
                      {item.documents && item.documents.length > 0 && (
                        <View style={styles.documentsContainer}>
                          <ThemedText style={styles.documentsLabel}>
                            📎 Attachments ({item.documents.length})
                          </ThemedText>
                          <View style={styles.documentsList}>
                            {item.documents.map((doc, docIndex) => (
                              <TouchableOpacity
                                key={docIndex}
                                style={styles.documentItem}
                                onPress={() => Linking.openURL(doc.url)}
                              >
                                <ThemedText style={styles.documentIcon}>
                                  {doc.type === 'image' ? '🖼️' : '📄'}
                                </ThemedText>
                                <ThemedText style={styles.documentName}>{doc.name}</ThemedText>
                                <ThemedText style={styles.documentArrow}>↗</ThemedText>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* View Details Link */}
                      <View style={styles.viewDetailsContainer}>
                        <TouchableOpacity
                          onPress={() => router.push(getRelatedUrl(item.related_type, item.related_id) as any)}
                        >
                          <ThemedText style={styles.viewDetailsText}>
                            View Details →
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  </View>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <ThemedText type="subtitle" style={styles.summaryTitle}>
            📊 Summary
          </ThemedText>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>Current Stage</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {timeline[timeline.length - 1]?.stage_name || 'N/A'}
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>Total Steps</ThemedText>
              <ThemedText style={styles.summaryValue}>{timeline.length}</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>Completed</ThemedText>
              <ThemedText style={[styles.summaryValue, { color: Colors.light.success }]}>
                {completedCount}
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>Total Duration</ThemedText>
              <ThemedText style={styles.summaryValue}>{total_duration || 'N/A'}</ThemedText>
            </View>
          </View>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl + Spacing.lg, // Extra bottom padding to avoid buttons
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.light.textSecondary,
  },
  errorCard: {
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    color: Colors.light.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerCard: {
    marginBottom: 16,
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  headerLeft: {
    flex: 1,
    minWidth: 200,
  },
  codeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  titleText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  headerRight: {
    alignItems: 'flex-end',
    minWidth: 150,
  },
  statBox: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.tint,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  progressBar: {
    width: 120,
    height: 6,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  timelineCard: {
    marginBottom: 16,
    padding: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.border,
  },
  timelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineIconText: {
    fontSize: 24,
  },
  timelineTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timelineSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 40,
  },
  timelineLine: {
    position: 'absolute',
    left: 20,
    top: 12,
    bottom: 12,
    width: 3,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
  },
  timelineLineFill: {
    width: '100%',
    borderRadius: 2,
  },
  timelineItems: {
    gap: 24,
  },
  timelineItem: {
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -40,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineDotNumber: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timelineCardItem: {
    marginLeft: 24,
    borderLeftWidth: 4,
    padding: 16,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  timelineCardLeft: {
    flex: 1,
    minWidth: 200,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stageIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  stageName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  metadataContainer: {
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataIcon: {
    fontSize: 16,
  },
  metadataLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  metadataRole: {
    fontWeight: 'normal',
    color: Colors.light.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  notesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 12,
    lineHeight: 20,
  },
  documentsContainer: {
    marginTop: 16,
  },
  documentsLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  documentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
  },
  documentIcon: {
    fontSize: 16,
  },
  documentName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.tint,
  },
  documentArrow: {
    fontSize: 10,
  },
  viewDetailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  summaryCard: {
    marginBottom: 32,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: 150,
    padding: 12,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  summaryLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

