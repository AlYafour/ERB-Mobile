import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { notificationsApi } from '@/lib/api/notifications';
import { useAppTheme } from '@/contexts/ThemeContext';

const BADGE_POLL_MS = 60_000;

function AlertsIcon({ focused, color, unread, badgeColor }: { focused: boolean; color: string; unread: number; badgeColor: string }) {
  return (
    <View style={s.iconWrap}>
      <IconSymbol name={focused ? 'bell.fill' : 'bell'} size={22} color={color} />
      {unread > 0 && (
        <View style={[s.badge, { backgroundColor: badgeColor }]}>
          <Text style={s.badgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const cs = useColorScheme() ?? 'light';
  const colors = Colors[cs];
  const { notificationsEnabled } = useAppTheme();

  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);

  const fetchUnread = async () => {
    try {
      const { count } = await notificationsApi.getUnreadCount();
      if (mounted.current) setUnreadCount(count ?? 0);
    } catch {
      // silent — badge is best-effort
    }
  };

  useEffect(() => {
    mounted.current = true;
    if (notificationsEnabled) {
      fetchUnread();
      pollRef.current = setInterval(fetchUnread, BADGE_POLL_MS);
    }
    return () => {
      mounted.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [notificationsEnabled]);

  // On Android with edge-to-edge + 3-button nav: insets.bottom can be 0 even with buttons present.
  // Minimum 12px ensures the bar never clips.
  const bottomPad = Math.max(insets.bottom, 12);
  const tabBarHeight = 64 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingBottom: bottomPad,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.1,
          marginTop: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
          gap: 3,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <IconSymbol name={focused ? 'house.fill' : 'house'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused, color }) => (
            <AlertsIcon focused={focused} color={color} unread={unreadCount} badgeColor={colors.danger} />
          ),
        }}
        listeners={{
          tabPress: () => {
            // Clear badge immediately on tab press — feels instant
            setUnreadCount(0);
          },
        }}
      />
      <Tabs.Screen
        name="hr"
        options={{
          title: 'HR',
          tabBarIcon: ({ focused, color }) => (
            <IconSymbol name={focused ? 'person.2.fill' : 'person.2'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <IconSymbol
              name={focused ? 'person.crop.circle.fill' : 'person.crop.circle'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  iconWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
});
