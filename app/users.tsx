import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { User, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';
import { CommonStyles } from '@/constants/common-styles';

export default function UsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = async () => {
    try {
      const response = await apiClient.get<PaginatedResponse<User>>(API_ENDPOINTS.USERS);
      if (response.data) {
        setUsers(response.data.results || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity onPress={() => router.push(`/users/${item.id}` as any)}>
      <Card style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>
              {item.first_name?.[0] || item.email?.[0] || 'U'}
            </ThemedText>
          </View>
          <View style={styles.userDetails}>
            <ThemedText type="defaultSemiBold" style={styles.userName}>
              {item.first_name && item.last_name
                ? `${item.first_name} ${item.last_name}`
                : item.email}
            </ThemedText>
            <ThemedText style={styles.userEmail}>{item.email}</ThemedText>
            {item.username && (
              <ThemedText style={styles.userUsername}>@{item.username}</ThemedText>
            )}
          </View>
        </View>
        <View style={styles.userBadges}>
          {item.is_staff && (
            <View style={[styles.badge, styles.staffBadge]}>
              <ThemedText style={styles.badgeText}>Staff</ThemedText>
            </View>
          )}
          {item.is_active ? (
            <View style={[styles.badge, styles.activeBadge]}>
              <ThemedText style={styles.badgeText}>Active</ThemedText>
            </View>
          ) : (
            <View style={[styles.badge, styles.inactiveBadge]}>
              <ThemedText style={styles.badgeText}>Inactive</ThemedText>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ThemedView style={styles.innerContainer}>
        <View style={styles.searchContainer}>
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchInput}
        />
      </View>
      <FlatList
        data={filteredUsers}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id || Math.random())}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <ThemedText style={styles.emptyText}>
            {loading ? 'Loading users...' : 'No users found'}
          </ThemedText>
        }
      />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.screenContainer,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  searchContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    ...CommonStyles.listContent,
  },
  userCard: {
    ...CommonStyles.itemCard,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    marginBottom: Spacing.xs,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  userEmail: {
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs / 2,
    fontWeight: Typography.weights.normal,
  },
  userUsername: {
    fontSize: Typography.sizes.sm,
    color: Colors.light.textTertiary,
    fontWeight: Typography.weights.normal,
  },
  userBadges: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  staffBadge: {
    backgroundColor: Colors.light.tint,
  },
  activeBadge: {
    backgroundColor: Colors.light.success,
  },
  inactiveBadge: {
    backgroundColor: Colors.light.textTertiary,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.medium,
  },
});

