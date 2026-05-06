import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { projectsApi } from '@/lib/api/projects';
import { toast } from '@/lib/hooks/use-toast';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography, ComponentSizes } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { CommonStyles } from '@/constants/common-styles';

const projectStatusOptions = [
  { value: 'on_going', label: 'On Going' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function NewProjectScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
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
    project_status: 'on_going',
    is_active: true,
  });

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) {
      toast('Project code and name are required', 'error');
      return;
    }

    try {
      setLoading(true);
      await projectsApi.create(formData);
      toast('Project created successfully', 'success');
      router.back();
    } catch (error: any) {
      toast(error.message || 'Failed to create project', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color={Colors.light.tint} />
            <ThemedText style={styles.backButtonText}>Back to Projects</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title" style={styles.mainTitle}>
            New Project
          </ThemedText>
        </View>

        {/* Basic Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Basic Information
          </ThemedText>
          <Input
            label="Project Code *"
            value={formData.code}
            onChangeText={(text) => setFormData({ ...formData, code: text })}
            placeholder="Enter project code"
          />
          <Input
            label="Project Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter project name"
          />
          <Input
            label="Description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Enter description"
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
          <Input
            label="Location"
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            placeholder="Enter location"
          />
          <Input
            label="Sector"
            value={formData.sector}
            onChangeText={(text) => setFormData({ ...formData, sector: text })}
            placeholder="Enter sector"
          />
          <Input
            label="Plot"
            value={formData.plot}
            onChangeText={(text) => setFormData({ ...formData, plot: text })}
            placeholder="Enter plot"
          />
          <Input
            label="Consultant"
            value={formData.consultant}
            onChangeText={(text) => setFormData({ ...formData, consultant: text })}
            placeholder="Enter consultant"
          />
        </Card>

        {/* Contact Information */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Contact Information
          </ThemedText>
          <Input
            label="Contact Person"
            value={formData.contact_person}
            onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
            placeholder="Enter contact person"
          />
          <Input
            label="Mobile Number"
            value={formData.mobile_number}
            onChangeText={(text) => setFormData({ ...formData, mobile_number: text })}
            placeholder="Enter mobile number"
            keyboardType="phone-pad"
          />
        </Card>

        {/* Dates */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Project Dates
          </ThemedText>
          <Input
            label="Start Date"
            value={formData.start_date}
            onChangeText={(text) => setFormData({ ...formData, start_date: text })}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label="End Date"
            value={formData.end_date}
            onChangeText={(text) => setFormData({ ...formData, end_date: text })}
            placeholder="YYYY-MM-DD"
          />
        </Card>

        {/* Status */}
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Status
          </ThemedText>
          <SearchableDropdown
            label="Project Status"
            options={projectStatusOptions}
            value={formData.project_status}
            onChange={(value) => setFormData({ ...formData, project_status: value as string })}
            placeholder="Select project status"
          />
          <View style={styles.checkboxContainer}>
            <Checkbox
              checked={formData.is_active}
              onChange={(checked) => setFormData({ ...formData, is_active: checked })}
              title="Active"
            />
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title={loading ? 'Creating...' : 'Create Project'}
            onPress={handleSubmit}
            disabled={loading}
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.screenContainer,
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
  mainTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.5,
  },
  card: {
    ...CommonStyles.card,
  },
  sectionTitle: {
    ...CommonStyles.sectionTitle,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.sizes.base,
    borderColor: Colors.light.border,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  checkboxContainer: {
    marginTop: Spacing.sm,
  },
  actionsContainer: {
    ...CommonStyles.submitContainer,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

