import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// This module is imported from the ROOT layout — nothing here may throw at
// import/boot time, or the app dies before the error boundary even mounts.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Notifications module unavailable — app must still boot.
}

export async function setupNotificationChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'AL Yafour Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  } catch {}
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: data ?? {},
        badge: 1,
      },
      trigger: null, // deliver immediately
    });
  } catch {
    // silently ignore — notification permission may not be granted
  }
}
