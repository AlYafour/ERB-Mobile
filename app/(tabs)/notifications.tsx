import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Notification } from '@/types';

export default function NotificationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const response = await apiClient.get<{ results: Notification[] }>(API_ENDPOINTS.NOTIFICATIONS);
      if (response.data) {
        setNotifications(response.data.results || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.post(API_ENDPOINTS.MARK_NOTIFICATION_READ(id));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}
      style={[
        styles.item,
        {
          backgroundColor: item.is_read ? colors.card : colors.tintSubtle,
          borderColor: item.is_read ? colors.border : colors.tint + '30',
        },
      ]}>
      <View style={styles.itemLeft}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: item.is_read ? colors.backgroundSecondary : colors.tintSubtle },
          ]}>
          <IconSymbol
            name={item.is_read ? 'bell' : 'bell.fill'}
            size={18}
            color={item.is_read ? colors.textTertiary : colors.tint}
          />
        </View>
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemHeader}>
          <Text
            style={[
              styles.itemTitle,
              { color: colors.text, fontWeight: item.is_read ? '400' : '600' },
            ]}
            numberOfLines={1}>
            {item.title}
          </Text>
          {!item.is_read && (
            <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />
          )}
        </View>
        <Text style={[styles.itemMessage, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.message}
        </Text>
        {item.created_at && (
          <Text style={[styles.itemDate, { color: colors.textTertiary }]}>
            {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : undefined}
      />

      {loading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id || Math.random())}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
                <IconSymbol name="bell.slash" size={32} color={colors.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                You're all caught up!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listEmpty: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemLeft: {
    marginRight: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1 },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  itemMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
  },
});
