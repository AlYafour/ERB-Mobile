import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { Input } from '@/components/ui/Input';
import { User, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing, Typography } from '@/constants/spacing';

export default function UsersScreen() {
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = async () => {
    try {
      setError(null);
      const response = await apiClient.get<PaginatedResponse<User>>(API_ENDPOINTS.USERS);
      if (response.data) {
        setUsers(response.data.results || []);
      } else if (response.error) {
        setError(response.error);
      }
    } catch {
      setError('Could not load users. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const q = searchQuery.toLowerCase();
  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(q) ||
      user.first_name?.toLowerCase().includes(q) ||
      user.last_name?.toLowerCase().includes(q) ||
      user.username?.toLowerCase().includes(q)
  );

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      onPress={() => router.push(`/users/${item.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`Open user ${item.first_name || item.email}`}
    >
      <AppCard style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: C.tint }]}>
            <Text style={[styles.avatarText, { color: C.primaryText }]}>
              {(item.first_name?.[0] || item.email?.[0] || 'U').toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: C.text }]} numberOfLines={1}>
              {item.first_name && item.last_name
                ? `${item.first_name} ${item.last_name}`
                : item.email}
            </Text>
            <Text style={[styles.userEmail, { color: C.textSecondary }]} numberOfLines={1}>
              {item.email}
            </Text>
            {item.username && (
              <Text style={[styles.userUsername, { color: C.textMuted }]}>@{item.username}</Text>
            )}
          </View>
        </View>
        <View style={styles.userBadges}>
          {item.is_staff && <AppBadge variant="info">Staff</AppBadge>}
          {item.is_active ? (
            <AppBadge variant="success">Active</AppBadge>
          ) : (
            <AppBadge variant="default">Inactive</AppBadge>
          )}
        </View>
      </AppCard>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <AppHeader title="Users" showBack />
      <View style={[styles.searchContainer, { borderBottomColor: C.divider }]}>
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchInput}
        />
      </View>

      {loading ? (
        <AppEmptyState variant="loading" title="Loading users..." />
      ) : error ? (
        <AppEmptyState variant="error" title="Could not load users" message={error ?? undefined} actionLabel="Retry" onAction={loadUsers} />
      ) : filteredUsers.length === 0 ? (
        <AppEmptyState
          variant="empty"
          title={searchQuery ? 'No users match your search' : 'No users found'}
        />
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { marginBottom: 0 },
  listContent: { padding: Spacing.lg, gap: Spacing.md },
  userCard: { marginBottom: Spacing.md },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  userDetails: { flex: 1 },
  userName: {
    marginBottom: 2,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.2,
  },
  userEmail: { fontSize: Typography.sizes.sm },
  userUsername: { fontSize: Typography.sizes.sm, marginTop: 2 },
  userBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
});
