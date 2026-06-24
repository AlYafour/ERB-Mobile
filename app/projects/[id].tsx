import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { projectsApi } from '@/lib/api/projects';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard, AppCardRow } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { Project } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AppColors = typeof Colors.light | typeof Colors.dark;

const statusLabels: Record<string, string> = {
  active:    'Active',
  completed: 'Completed',
  on_hold:   'On Hold',
  inactive:  'Inactive',
  on_going:  'On Going',
  cancelled: 'Cancelled',
};

function getStatusVariant(s?: string): 'success' | 'danger' | 'warning' | 'info' | 'default' {
  switch (s) {
    case 'active':    return 'success';
    case 'completed': return 'info';
    case 'on_hold':   return 'warning';
    case 'inactive':  return 'danger';
    case 'cancelled': return 'danger';
    default:          return 'default';
  }
}

function fmtDate(d?: string | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProjectDetailScreen() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isSuperuser = user?.is_superuser ?? false;
  const canUpdate = isSuperuser || (hasPermission('project', 'update') ?? false);

  const load = async () => {
    try {
      setLoading(true);
      setProject(await projectsApi.getById(id));
    } catch (err: any) {
      toast(err.message || 'Failed to load project', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const S = makeStyles(C);

  if (loading) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Project" showBack />
      <View style={S.center}><AppEmptyState variant="loading" title="Loading project..." /></View>
    </SafeAreaView>
  );

  if (!project) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Project" showBack />
      <View style={S.center}><AppEmptyState variant="empty" title="Project not found" /></View>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.primary} colors={[C.primary]} />
        }
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
    container: { flex: 1, backgroundColor: C.background },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content:   { padding: 16, paddingBottom: 24 },
    card:      { marginBottom: 12 },
    sectionTitle: {
      fontSize: 15, fontWeight: '700', color: C.textPrimary,
      marginBottom: 14, letterSpacing: -0.2,
    },
    editBtn: { marginTop: 8 },
  });
}
