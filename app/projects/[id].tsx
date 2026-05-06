import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { projectsApi } from '@/lib/api/projects';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Project } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { CommonStyles } from '@/constants/common-styles';

const statusColors: Record<string, string> = {
  on_going: '#ffc107',
  completed: '#28a745',
  on_hold: '#17a2b8',
  cancelled: '#dc3545',
};

const statusLabels: Record<string, string> = {
  on_going: 'On Going',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

export default function ProjectDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.is_superuser || user?.is_staff;

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await projectsApi.getById(id);
      setProject(data);
    } catch (error: any) {
      console.error('Error loading project:', error);
      toast(error.message || 'Failed to load project', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProject();
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <ThemedText style={styles.loadingText}>Loading project...</ThemedText>
      </ThemedView>
    );
  }

  if (!project) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.errorText}>Project not found</ThemedText>
      </ThemedView>
    );
  }

  const getStatusVariant = (): 'success' | 'error' | 'warning' | 'info' => {
    const status = project.project_status || project.status;
    if (status === 'completed') return 'success';
    if (status === 'cancelled') return 'error';
    if (status === 'on_hold') return 'info';
    return 'warning';
  };

  const getStatusLabel = () => {
    const status = project.project_status || project.status;
    return statusLabels[status || ''] || status || 'Unknown';
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color={Colors.light.tint} />
            <ThemedText style={styles.backButtonText}>Back to Projects</ThemedText>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <ThemedText type="title" style={styles.mainTitle}>
              {project.name || 'Unnamed Project'}
            </ThemedText>
            {project.code && <ThemedText style={styles.subtitle}>{project.code}</ThemedText>}
            <View style={styles.statusContainer}>
              <Badge variant={getStatusVariant()}>{getStatusLabel()}</Badge>
            </View>
          </View>
        </View>

        {/* Basic Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Basic Information
          </ThemedText>
          {project.name && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Name:</ThemedText>
              <ThemedText style={styles.value}>{project.name}</ThemedText>
            </View>
          )}
          {project.code && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Code:</ThemedText>
              <ThemedText style={styles.value}>{project.code}</ThemedText>
            </View>
          )}
          {project.description && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Description:</ThemedText>
              <ThemedText style={styles.value}>{project.description}</ThemedText>
            </View>
          )}
          {project.location && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Location:</ThemedText>
              <ThemedText style={styles.value}>{project.location}</ThemedText>
            </View>
          )}
          {project.sector && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Sector:</ThemedText>
              <ThemedText style={styles.value}>{project.sector}</ThemedText>
            </View>
          )}
          {project.plot && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Plot:</ThemedText>
              <ThemedText style={styles.value}>{project.plot}</ThemedText>
            </View>
          )}
          {project.consultant && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.label}>Consultant:</ThemedText>
              <ThemedText style={styles.value}>{project.consultant}</ThemedText>
            </View>
          )}
        </Card>

        {/* Contact Information */}
        {(project.contact_person || project.mobile_number) && (
          <Card style={styles.card}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Contact Information
            </ThemedText>
            {project.contact_person && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Contact Person:</ThemedText>
                <ThemedText style={styles.value}>{project.contact_person}</ThemedText>
              </View>
            )}
            {project.mobile_number && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Mobile Number:</ThemedText>
                <ThemedText style={styles.value}>{project.mobile_number}</ThemedText>
              </View>
            )}
          </Card>
        )}

        {/* Dates */}
        {(project.start_date || project.end_date) && (
          <Card style={styles.card}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Project Dates
            </ThemedText>
            {project.start_date && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Start Date:</ThemedText>
                <ThemedText style={styles.value}>
                  {new Date(project.start_date).toLocaleDateString()}
                </ThemedText>
              </View>
            )}
            {project.end_date && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>End Date:</ThemedText>
                <ThemedText style={styles.value}>
                  {new Date(project.end_date).toLocaleDateString()}
                </ThemedText>
              </View>
            )}
          </Card>
        )}

        {/* Actions */}
        {isAdmin && (
          <View style={styles.actionsContainer}>
            <Button
              title="Edit Project"
              onPress={() => router.push(`/projects/${id}/edit` as any)}
              variant="primary"
              style={styles.actionButton}
            />
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.screenContainer,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.light.text,
    fontWeight: Typography.weights.medium,
  },
  errorText: {
    fontSize: Typography.sizes.base,
    color: Colors.light.error,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },
  scrollContent: {
    ...CommonStyles.scrollContent,
  },
  header: {
    marginBottom: Layout.sectionMarginBottom,
    paddingTop: Spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
    padding: Spacing.xs,
  },
  backButtonText: {
    fontSize: Typography.sizes.base,
    color: Colors.light.tint,
    fontWeight: Typography.weights.medium,
  },
  titleContainer: {
    marginBottom: Spacing.xs,
  },
  mainTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: Typography.weights.normal,
  },
  statusContainer: {
    marginTop: Spacing.sm,
  },
  card: {
    ...CommonStyles.card,
  },
  sectionTitle: {
    ...CommonStyles.sectionTitle,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: Typography.sizes.base,
    color: Colors.light.text,
    flex: 1,
    textAlign: 'right',
    fontWeight: Typography.weights.normal,
  },
  actionsContainer: {
    marginTop: Layout.sectionMarginTop,
    gap: Spacing.md,
  },
  actionButton: {
    marginBottom: 0,
  },
});

