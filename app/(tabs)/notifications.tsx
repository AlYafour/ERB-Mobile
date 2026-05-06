import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Notification } from '@/types';

export default function NotificationsScreen() {
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

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity onPress={() => markAsRead(item.id)}>
      <Card style={[styles.notificationCard, !item.is_read && styles.unreadCard]}>
        <ThemedText type="defaultSemiBold" style={styles.notificationTitle}>
          {item.title}
        </ThemedText>
        <ThemedText style={styles.notificationMessage}>{item.message}</ThemedText>
        {item.created_at && (
          <ThemedText style={styles.notificationDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </ThemedText>
        )}
        {!item.is_read && <View style={styles.unreadIndicator} />}
      </Card>
    </TouchableOpacity>
  );

  if (loading && notifications.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.emptyText}>Loading notifications...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id || Math.random())}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <ThemedText style={styles.emptyText}>No notifications</ThemedText>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    position: 'relative',
    marginBottom: 12,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#0a7ea4',
  },
  notificationTitle: {
    marginBottom: 4,
  },
  notificationMessage: {
    marginBottom: 8,
    opacity: 0.8,
  },
  notificationDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0a7ea4',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    opacity: 0.6,
  },
});

