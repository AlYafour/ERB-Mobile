import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { usersApi } from '@/lib/api/users';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppPagination } from '@/components/ui/AppPagination';
import { Input } from '@/components/ui/Input';
import { User, PaginatedResponse } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing, Typography } from '@/constants/spacing';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';

function UsersScreenInner() {
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Debounce search 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadUsers = async () => {
    try {
      setError(null);
      const response = await usersApi.getAll({ page, page_size: 50, search: debouncedSearch });
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Could not load users. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  // Stale-list fix: refetch when the screen regains focus
  useRefetchOnFocus(loadUsers);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const users = data?.results ?? [];

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      onPress={() => router.push(`/users/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open user ${item.first_name || item.email}`}
    >
      <AppCard style={styles.userCard}>
        <View style={styles.userInfo}>
          {/* Avatar-with-initial is a deliberate exception to the shared
              DocumentIconTile used across procurement list screens — these
              rows represent people, not documents. */}
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
          value={search}
          onChangeText={setSearch}
          containerStyle={styles.searchInput}
        />
      </View>

      {loading ? (
        <AppEmptyState variant="loading" title="Loading users..." />
      ) : error ? (
        <AppErrorState title="Could not load users" message={error} onRetry={loadUsers} retryLabel="Retry" />
      ) : users.length === 0 ? (
        <AppEmptyState
          variant="empty"
          title={search ? 'No users match your search' : 'No users found'}
        />
      ) : (
        <FlashList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListFooterComponent={
            data && data.count > 50 ? (
              <AppPagination
                page={page}
                pageSize={50}
                totalCount={data.count}
                hasPrevious={!!data.previous}
                hasNext={!!data.next}
                onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => p + 1)}
              />
            ) : null
          }
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


export default function UsersScreen() {
  return (
    <AppPermissionGate category="user" action="view">
      <UsersScreenInner />
    </AppPermissionGate>
  );
}
