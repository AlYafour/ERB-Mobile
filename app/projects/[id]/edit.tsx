import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { projectsApi } from '@/lib/api/projects';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppSkeletonList } from '@/components/ui/AppSkeleton';
import { Input } from '@/components/ui/Input';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { FormBottomBar } from '@/components/ui/FormBottomBar';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useEditForm } from '@/lib/hooks/use-edit-form';
import { baseDetailStyles } from '@/lib/utils/detail-styles';

type AppColors = typeof Colors.light | typeof Colors.dark;

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active' },
  { value: 'on_hold',   label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'inactive',  label: 'Inactive' },
];

interface ProjectEditForm {
  code: string;
  name: string;
  description: string;
  location: string;
  sector: string;
  plot: string;
  consultant: string;
  contact_person: string;
  mobile_number: string;
  start_date: string;
  end_date: string;
  project_status: string;
  is_active: boolean;
}

function EditProjectScreenInner() {
  const { id: paramId } = useLocalSearchParams();
  const router = useRouter();
  const id = Number(paramId);
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const S = makeStyles(C);

  const { loading, saving, errors, form, set, handleSubmit } = useEditForm<ProjectEditForm>({
    id,
    load: async () => {
      const p = await projectsApi.getById(id);
      return {
        code:           p.code || '',
        name:           p.name || '',
        description:    p.description || '',
        location:       p.location || '',
        sector:         p.sector || '',
        plot:           p.plot || '',
        consultant:     p.consultant || '',
        contact_person: p.contact_person || '',
        mobile_number:  p.mobile_number || '',
        start_date:     p.start_date ? p.start_date.split('T')[0] : '',
        end_date:       p.end_date ? p.end_date.split('T')[0] : '',
        project_status: p.project_status || p.status || 'active',
        is_active:      p.is_active ?? true,
      };
    },
    validate: (f) => {
      const e: Record<string, string> = {};
      if (!f.code.trim()) e.code = 'Project code is required';
      if (!f.name.trim()) e.name = 'Project name is required';
      return e;
    },
    submit: (f) => projectsApi.update(id, f),
    loadErrorMessage: 'Failed to load project',
    successMessage: 'Project updated successfully',
    submitErrorMessage: 'Failed to update project',
  });

  if (loading || !form) return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <AppHeader title="Edit Project" showBack />
      <AppSkeletonList count={3} lines={4} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader title="Edit Project" showBack />

      <ScrollView contentContainerStyle={S.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Basic Information</Text>
          <Input label="Project Code *" value={form.code} onChangeText={set('code')}
            placeholder="Enter project code" error={errors.code} />
          <Input label="Project Name *" value={form.name} onChangeText={set('name')}
            placeholder="Enter project name" error={errors.name} />
          <Input label="Description" value={form.description} onChangeText={set('description')}
            placeholder="Enter description" multiline numberOfLines={3} />
          <Input label="Location" value={form.location} onChangeText={set('location')}
            placeholder="Enter location" />
          <Input label="Sector" value={form.sector} onChangeText={set('sector')}
            placeholder="Enter sector" />
          <Input label="Plot" value={form.plot} onChangeText={set('plot')} placeholder="Enter plot" />
          <Input label="Consultant" value={form.consultant} onChangeText={set('consultant')}
            placeholder="Enter consultant" />
        </AppCard>

        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Contact Information</Text>
          <Input label="Contact Person" value={form.contact_person} onChangeText={set('contact_person')}
            placeholder="Enter contact person" />
          <Input label="Mobile Number" value={form.mobile_number} onChangeText={set('mobile_number')}
            placeholder="Enter mobile number" keyboardType="phone-pad" />
        </AppCard>

        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Project Dates</Text>
          <Input label="Start Date" value={form.start_date} onChangeText={set('start_date')}
            placeholder="YYYY-MM-DD" />
          <Input label="End Date" value={form.end_date} onChangeText={set('end_date')}
            placeholder="YYYY-MM-DD" />
        </AppCard>

        <AppCard style={S.card}>
          <Text style={S.sectionTitle}>Status</Text>
          <SearchableDropdown label="Project Status" options={STATUS_OPTIONS}
            value={form.project_status}
            onChange={(v) => set('project_status')(v as string)}
            placeholder="Select status" />
          <View style={S.switchRow}>
            <Text style={[S.switchLabel, { color: C.textPrimary }]}>Active</Text>
            <Switch value={form.is_active} onValueChange={set('is_active')}
              trackColor={{ true: C.primary, false: C.border }} thumbColor="#fff" />
          </View>
        </AppCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FormBottomBar
        onCancel={() => router.back()}
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
        loading={saving}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    ...baseDetailStyles(C),
    content: { padding: 16, paddingBottom: 8 },
    switchRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 10, marginTop: 4,
    },
    switchLabel: { fontSize: 14, fontWeight: '500' },
  });
}


export default function EditProjectScreen() {
  return (
    <AppPermissionGate category="project" action="update">
      <EditProjectScreenInner />
    </AppPermissionGate>
  );
}
