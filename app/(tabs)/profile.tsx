import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    refreshUser();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <IconSymbol name="person.fill" size={48} color={Colors.light.tint} />
            </View>
          </View>
          <ThemedText type="title" style={styles.name}>
            {user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : user?.email || 'User'}
          </ThemedText>
          <ThemedText style={styles.email}>{user?.email}</ThemedText>
          {user?.username && (
            <ThemedText style={styles.username}>@{user.username}</ThemedText>
          )}
        </Card>

        <View style={styles.menuSection}>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={styles.menuItem}>
            <IconSymbol name="gearshape.fill" size={24} color={Colors.light.icon} />
            <ThemedText style={styles.menuItemText}>Settings</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={Colors.light.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={styles.menuItem}>
            <IconSymbol name="bell.fill" size={24} color={Colors.light.icon} />
            <ThemedText style={styles.menuItemText}>Notifications</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={Colors.light.icon} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Account Information
          </ThemedText>
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>User ID</ThemedText>
              <ThemedText style={styles.infoValue}>{user?.id || 'N/A'}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Status</ThemedText>
              <ThemedText style={styles.infoValue}>
                {user?.is_active ? 'Active' : 'Inactive'}
              </ThemedText>
            </View>
            {user?.is_staff && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Role</ThemedText>
                <ThemedText style={styles.infoValue}>Staff</ThemedText>
              </View>
            )}
            {user?.date_joined && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Member Since</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {new Date(user.date_joined).toLocaleDateString()}
                </ThemedText>
              </View>
            )}
          </Card>
        </View>

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          fullWidth
          style={styles.logoutButton}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl + Spacing.lg, // Extra bottom padding to avoid buttons
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    marginBottom: 4,
    opacity: 0.7,
    textAlign: 'center',
  },
  username: {
    opacity: 0.6,
    textAlign: 'center',
  },
  menuSection: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  menuItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  infoCard: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    opacity: 0.7,
  },
  infoValue: {
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 8,
  },
});

