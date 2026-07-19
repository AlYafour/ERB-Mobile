import { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { projectsApi } from '@/lib/api/projects';
import { toast } from '@/lib/hooks/use-toast';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppSectionHeader } from '@/components/ui/AppScreen';
import { FormBottomBar } from '@/components/ui/FormBottomBar';
import { Input } from '@/components/ui/Input';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import DatePickerInput from '@/components/ui/DatePickerInput';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppPermissionGate } from '@/components/AppPermissionGate';

type AppColors = typeof Colors.light | typeof Colors.dark;

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active' },
  { value: 'on_hold',   label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'inactive',  label: 'Inactive' },
];

function NewProjectScreenInner() {
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const S = makeStyles(C);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    location: '',
    sector: '',
    plot: '',
    consultant: '',
    contact_person: '',
    mobile_number: '',
    start_date: '',
    end_date: '',
    project_status: 'active',
    is_active: true,
  });

  const set = (key: keyof typeof form) => (val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'Project code is required';
    if (!form.name.trim()) e.name = 'Project name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      await projectsApi.create(form);
      toast('Project created successfully', 'success');
      router.back();
    } catch (err: any) {
      toast(err.message || 'Failed to create project', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <AppHeader title="New Project" showBack />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={S.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Basic Information */}
        <AppSectionHeader title="Basic Information" style={S.sectionHeaderOverride} />
        <AppCard style={S.card}>
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

        {/* Contact */}
        <AppSectionHeader title="Contact Information" style={S.sectionHeaderOverride} />
        <AppCard style={S.card}>
          <Input label="Contact Person" value={form.contact_person} onChangeText={set('contact_person')}
            placeholder="Enter contact person" />
          <Input label="Mobile Number" value={form.mobile_number} onChangeText={set('mobile_number')}
            placeholder="Enter mobile number" keyboardType="phone-pad" />
        </AppCard>

        {/* Dates */}
        <AppSectionHeader title="Project Dates" style={S.sectionHeaderOverride} />
        <AppCard style={S.card}>
          <DatePickerInput label="Start Date" value={form.start_date} onChange={set('start_date')}
            placeholder="Select date" />
          <DatePickerInput label="End Date" value={form.end_date} onChange={set('end_date')}
            placeholder="Select date"
            minimumDate={form.start_date ? new Date(form.start_date) : undefined} />
        </AppCard>

        {/* Status */}
        <AppSectionHeader title="Status" style={S.sectionHeaderOverride} />
        <AppCard style={S.card}>
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
      </KeyboardAvoidingView>

      <FormBottomBar
        onCancel={() => router.back()}
        cancelDisabled={saving}
        submitLabel="Create Project"
        onSubmit={handleSubmit}
        loading={saving}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    content:   { padding: 16, paddingBottom: 8 },
    card:      { marginBottom: 12 },
    sectionHeaderOverride: { paddingHorizontal: 4 },
    switchRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 10, marginTop: 4,
    },
    switchLabel: { fontSize: 14, fontWeight: '500' },
  });
}


export default function NewProjectScreen() {
  return (
    <AppPermissionGate category="project" action="create">
      <NewProjectScreenInner />
    </AppPermissionGate>
  );
}
