import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { secureTokenStorage } from '@/lib/secure-storage';

/**
 * App Lock — biometric convenience layer.
 *
 * Security model (deliberate boundaries, do not weaken):
 * - The session credential (refresh token) is protected by the OS keychain
 *   via secure-storage.ts regardless of this module. App Lock is a UI gate
 *   in front of an already-secured session — NOT the session's protection.
 * - Enabling requires a successful live biometric authentication (proves
 *   hardware + enrollment + user intent in one step).
 * - The gate never silently bypasses: cancel/failed attempts keep the lock
 *   screen with explicit retry / sign-out choices.
 * - `disableDeviceFallback: false` → the OS offers device passcode as the
 *   fallback, which is the platform-correct behavior (same trust root).
 * - Logout clears the flag: App Lock is a per-session preference.
 */

const APP_LOCK_KEY = 'app_lock_enabled';

export type BiometricCapabilities = {
  /** Device has biometric hardware. */
  hasHardware: boolean;
  /** At least one biometric (or device credential) is enrolled. */
  enrolled: boolean;
  /** Human label for the strongest available method. */
  label: string;
};

export type UnlockResult = 'success' | 'cancelled' | 'failed' | 'unavailable';

export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  if (Platform.OS === 'web') {
    return { hasHardware: false, enrolled: false, label: 'Biometrics' };
  }
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    let label = 'Biometrics';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      label = Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      label = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    return { hasHardware, enrolled, label };
  } catch {
    return { hasHardware: false, enrolled: false, label: 'Biometrics' };
  }
}

export async function isAppLockEnabled(): Promise<boolean> {
  return (await secureTokenStorage.getItem(APP_LOCK_KEY)) === '1';
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await secureTokenStorage.setItem(APP_LOCK_KEY, '1');
  } else {
    await secureTokenStorage.removeItem(APP_LOCK_KEY);
  }
}

/**
 * Run one biometric authentication round.
 * Maps the platform result onto explicit outcomes so callers can implement
 * correct (non-bypassing) fallback UI.
 */
export async function authenticateBiometric(promptMessage: string): Promise<UnlockResult> {
  const caps = await getBiometricCapabilities();
  if (!caps.hasHardware || !caps.enrolled) return 'unavailable';

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // allow device passcode — same OS trust root
      requireConfirmation: false,
    });
    if (result.success) return 'success';
    const err = (result as { error?: string }).error ?? '';
    if (err === 'user_cancel' || err === 'system_cancel' || err === 'app_cancel') {
      return 'cancelled';
    }
    if (err === 'not_enrolled' || err === 'passcode_not_set' || err === 'not_available') {
      return 'unavailable';
    }
    return 'failed';
  } catch {
    return 'failed';
  }
}
