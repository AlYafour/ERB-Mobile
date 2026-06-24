import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { notificationsApi } from '@/lib/api/notifications';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Notification } from '@/types';
import { toast } from '@/lib/hooks/use-toast';
import { useAppTheme } from '@/contexts/ThemeContext';

const POLL_INTERVAL_MS = 60_000; // 60 seconds

// Route map for tapping a notification to navigate to the related document
const NOTIFICATION_ROUTES: Record<string, (id: string) => string> = {
  purchase_request: id => `/purchase-requests/${id}`,
  purchase_order:   id => `/purchase-orders/${id}`,
  goods_receiving:  id => `/goods-receiving/${id}`,
  invoice:          id => `/purchase-invoices/${id}`,
  quotation:        id => `/purchase-quotations/${id}`,
  hr_request:       id => `/hr/requests`,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { notificationsEnabled } = useAppTheme();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);

  const loadNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(null);
      const data = await notificationsApi.getAll({ page: 1 });
      if (!mounted.current) return;
      setNotifications(data.results ?? []);
    } catch (err: any) {
      if (!mounted.current) return;
      if (!silent) setError(err.message || 'Failed to load notifications');
    } finally {
      if (!mounted.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadNotifications(false);

    // Poll only when notifications are enabled
    if (notificationsEnabled) {
      pollRef.current = setInterval(() => loadNotifications(true), POLL_INTERVAL_MS);
    }

    return () => {
      mounted.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadNotifications, notificationsEnabled]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications(false);
  };

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await notificationsApi.markAsRead(id);
    } catch {
      // Revert on failure
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
      if (__DEV__) console.error('Error marking notification as read');
    }
  };

  const markAllRead = async () => {
    const hasUnread = notifications.some(n => !n.is_read);
    if (!hasUnread) return;
    setMarkingAll(true);
    const prev = [...notifications];
    setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
    try {
      await notificationsApi.markAllAsRead();
      toast('All notifications marked as read', 'success');
    } catch {
      setNotifications(prev);
      toast('Failed to mark all as read', 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationPress = (item: Notification) => {
    markAsRead(item.id);
    // Try to navigate to the related document if we can infer the type
    const type = item.type;
    const relatedId = item.related_id ?? item.object_id;
    if (type && relatedId && NOTIFICATION_ROUTES[type]) {
      router.push(NOTIFICATION_ROUTES[type](String(relatedId)) as any);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
      style={[
        styles.item,
        {
          backgroundColor: item.is_read ? colors.card : colors.tintSubtle,
          borderColor: item.is_read ? colors.border : colors.tint + '30',
        },
      ]}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconWrap, { backgroundColor: item.is_read ? colors.backgroundSecondary : colors.tintSubtle }]}>
          <IconSymbol
            name={item.is_read ? 'bell' : 'bell.fill'}
            size={18}
            color={item.is_read ? colors.textMuted : colors.tint}
          />
        </View>
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemHeader}>
          <Text
            style={[styles.itemTitle, { color: colors.text, fontWeight: item.is_read ? '400' : '600' }]}
            numberOfLines={1}
          >
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
          <Text style={[styles.itemDate, { color: colors.textMuted }]}>
            {new Date(item.created_at).toLocaleDateString('en-AE', {
              month: 'short', day: 'numeric', year: 'numeric',
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
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={markAllRead}
              disabled={markingAll}
              style={[styles.markAllBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.markAllText, { color: colors.tint }]}>
                {markingAll ? 'Marking…' : 'Mark all read'}
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading && notifications.length === 0 ? (
        <AppEmptyState variant="loading" title="Loading notifications…" />
      ) : error && notifications.length === 0 ? (
        <AppEmptyState
          variant="error"
          title="Failed to load"
          message={error}
          actionLabel="Try Again"
          onAction={() => loadNotifications(false)}
        />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item, idx) => String(item.id ?? item.created_at ?? idx)}
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
            <AppEmptyState
              variant="empty"
              icon="bell.slash"
              title="No notifications"
              message="You're all caught up!"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  listEmpty: { flex: 1 },
  markAllBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markAllText: { fontSize: 12, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemLeft: { marginRight: 12 },
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
  itemTitle: { fontSize: 14, flex: 1, marginRight: 8 },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5 },
  itemMessage: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  itemDate: { fontSize: 11 },
});
