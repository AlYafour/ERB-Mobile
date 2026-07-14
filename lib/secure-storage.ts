import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Token storage boundary.
 *
 * Secrets (access/refresh JWTs) live in the OS keychain/keystore via
 * expo-secure-store — hardware-encrypted, excluded from device backups,
 * unreadable to other apps even on rooted devices in most configurations.
 * Previously they sat in plaintext AsyncStorage.
 *
 * Migration is transparent: the first read after this update finds the legacy
 * AsyncStorage value, moves it into SecureStore, and deletes the plaintext
 * copy — existing sessions survive the upgrade without re-login.
 *
 * Non-secret profile cache (user object, branding) stays in AsyncStorage:
 * SecureStore values are size-limited (~2KB guidance) and the profile is not
 * a credential.
 *
 * Web (expo web / dev in browser) has no SecureStore — falls back to
 * AsyncStorage there, matching the previous behavior on that platform.
 */

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export const secureTokenStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!isNative) return AsyncStorage.getItem(key);
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value != null) return value;
      // One-time migration from legacy plaintext storage
      const legacy = await AsyncStorage.getItem(key);
      if (legacy != null) {
        await SecureStore.setItemAsync(key, legacy);
        await AsyncStorage.removeItem(key);
        return legacy;
      }
      return null;
    } catch {
      // Keychain unavailable (rare, e.g. device locked during background fetch)
      return AsyncStorage.getItem(key);
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!isNative) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
      // Ensure no stale plaintext copy survives
      await AsyncStorage.removeItem(key);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isNative) {
      await SecureStore.deleteItemAsync(key).catch(() => {});
    }
    await AsyncStorage.removeItem(key).catch(() => {});
  },
};
