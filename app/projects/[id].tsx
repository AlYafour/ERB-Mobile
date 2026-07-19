import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { projectsApi } from '@/lib/api/projects';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard, AppCardRow } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge, BadgeVariant } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppSkeletonList } from '@/components/ui/AppSkeleton';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useDetailFetch } from '@/lib/hooks/use-detail-fetch';
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh';
import { baseDetailStyles } from '@/lib/utils/detail-styles';

type AppColors = typeof Colors.light | typeof Colors.dark;

const statusLabels: Record<string, string> = {
  active:    'Active',
  completed: 'Completed',
  on_hold:   'On Hold',
  inactive:  'Inactive',
  on_going:  'On Going',
  cancelled: 'Cancelled',
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  active: 'success',
  completed: 'info',
  on_hold: 'warning',
  inactive: 'danger',
  cancelled: 'danger',
};

function getStatusVariant(s?: string): BadgeVariant {
  return STATUS_VARIANTS[s || ''] ?? 'default';
}

function fmtDate(d?: string | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ProjectDetailScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const isSuperuser = user?.is_superuser ?? false;
  const canUpdate = isSuperuser || (hasPermission('project', 'update') ?? false);

  const { data: project, loading, refreshing, reload, onRefresh } = useDetailFetch(
    (projId: number) => projectsApi.getById(projId), id, 'Failed to load project'
  );
  const pullToRefresh = usePullToRefresh(refreshing, onRefresh);

  const S = makeStyles(C);

  if (loading && !project) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Project" showBack />
      <AppSkeletonList count={3} lines={4} />
    </SafeAreaView>
  );

  if (!project) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Project" showBack />
      <View style={S.center}>
        <AppEmptyState
          variant="error"
          title="Failed to load"
          message="Could not load the project."
          actionLabel="Try Again"
          onAction={reload}
        />
      </View>
    </SafeAreaView>
  );

  const r = project as any;
  const status = r.project_status || project.status || null;
  const statusLabel = statusLabels[status || ''] || status || 'Unknown';
  const officeLocation: { id: number; name: string; latitude?: number; longitude?: number; radius_m?: number } | null =
    r.office_location_detail || null;

  return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader
        title={project.name || 'Project'}
        subtitle={project.code || undefined}
        showBack
        right={status ? (
          <AppBadge variant={getStatusVariant(status)}>{statusLabel}</AppBadge>
        ) : undefined}
      />

      <ScrollView
        contentContainerStyle={S.content}
        refreshControl={pullToRefresh}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Basic Information</Text>
          <AppCardRow label="Name"        value={project.name} />
          <AppCardRow label="Code"        value={project.code} />
          <AppCardRow label="Description" value={project.description} />
          <AppCardRow label="Location"    value={project.location} />
          <AppCardRow label="Sector"      value={r.sector} />
          <AppCardRow label="Plot"        value={r.plot} />
          <AppCardRow label="Consultant"  value={r.consultant} last />
        </AppCard>

        {/* Contact Information */}
        {(project.contact_person || project.mobile_number) ? (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Contact Information</Text>
            <AppCardRow label="Contact Person" value={project.contact_person} />
            <AppCardRow label="Mobile Number"  value={project.mobile_number} last />
          </AppCard>
        ) : null}

        {/* Project Dates */}
        {(project.start_date || project.end_date) ? (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Project Dates</Text>
            <AppCardRow label="Start Date" value={fmtDate(project.start_date)} />
            <AppCardRow label="End Date"   value={fmtDate(project.end_date)} last />
          </AppCard>
        ) : null}

        {/* Office / Site Location (from Phase 1 migration FK) */}
        {officeLocation ? (
          <AppCard style={S.card}>
            <Text style={S.sectionTitle}>Office / Site Location</Text>
            <AppCardRow label="Name"      value={officeLocation.name} />
            {officeLocation.radius_m != null ? (
              <AppCardRow label="Radius" value={`${officeLocation.radius_m} m`} last />
            ) : (
              <AppCardRow label="ID"     value={String(officeLocation.id)} last />
            )}
          </AppCard>
        ) : null}

        {canUpdate ? (
          <AppButton
            title="Edit Project"
            variant="primary"
            size="md"
            onPress={() => router.push(`/projects/${id}/edit` as any)}
            style={S.editBtn}
          />
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    ...baseDetailStyles(C),
    editBtn: { marginTop: 8 },
  });
}


export default function ProjectDetailScreen() {
  return (
    <AppPermissionGate category="project" action="view">
      <ProjectDetailScreenInner />
    </AppPermissionGate>
  );
}
