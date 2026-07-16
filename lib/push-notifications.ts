import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { apiClient } from '@/lib/api';

/**
 * Device push registration against the backend mobile API (Phase 19).
 *
 * The backend stores RAW FCM/APNS tokens (mobile/models.py DeviceToken) and
 * sends through FCM with FIREBASE_SERVER_KEY (mobile/push.py) — so we register
 * the NATIVE device token (getDevicePushTokenAsync), not an ExponentPushToken.
 *
 * Requirements for push to actually fire end-to-end:
 *   - Android: google-services.json wired into the EAS build (FCM)
 *   - Backend: FIREBASE_SERVER_KEY configured
 * When either is missing every step below fails/no-ops SILENTLY and the app
 * keeps its focused-tab polling fallback — no user-facing breakage.
 */

const DEVICE_ID_KEY = '@push_device_id';
const REGISTRATION_ID_KEY = '@push_registration_id';

/** Stable per-install id so re-registrations upsert instead of duplicating. */
async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `${Platform.OS}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export async function registerDeviceForPush(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;

    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) return false;

    // Native token (FCM on Android, APNs on iOS) — what mobile/push.py expects.
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (!token) return false;

    const deviceId = await getDeviceId();
    const res = await apiClient.post<{ id: number }>('/api/mobile/devices/', {
      platform: Platform.OS,
      token: String(token),
      device_id: deviceId,
      app_version: Constants.expoConfig?.version ?? '',
    });
    if (res.data?.id != null) {
      await AsyncStorage.setItem(REGISTRATION_ID_KEY, String(res.data.id));
      return true;
    }
    return false;
  } catch {
    // Missing FCM config / emulator without Play services — polling covers it.
    return false;
  }
}

/**
 * Best-effort deactivation on logout so the NEXT account on this device
 * never receives the previous user's pushes.
 */
export async function unregisterDeviceForPush(): Promise<void> {
  try {
    const regId = await AsyncStorage.getItem(REGISTRATION_ID_KEY);
    if (regId) {
      await apiClient.delete(`/api/mobile/devices/${regId}/`).catch(() => {});
      await AsyncStorage.removeItem(REGISTRATION_ID_KEY);
    }
  } catch {}
}
