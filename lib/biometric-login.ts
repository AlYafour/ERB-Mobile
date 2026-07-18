import { secureTokenStorage } from '@/lib/secure-storage';

/**
 * Face ID / biometric SIGN-IN — distinct from App Lock (lib/app-lock.ts).
 *
 * App Lock gates an ALREADY-active session (the refresh token is valid;
 * biometrics just re-open the app). This module gates a STORED credential
 * used to establish a BRAND NEW session — the same pattern iOS/Android use
 * for "biometric autofill" of a saved password (e.g. Keychain AutoFill):
 * Face ID does not itself authenticate the user to the SERVER, it only
 * unlocks access to the username/password already saved on THIS device,
 * which are then submitted through the real POST /api/auth/login/ exactly
 * as if typed by hand (2FA still applies normally if the account has it).
 *
 * Credentials live in the OS keychain via secureTokenStorage — the same
 * trust root as the session tokens themselves.
 */

const BIO_LOGIN_ENABLED_KEY  = 'biometric_login_enabled';
const BIO_LOGIN_USERNAME_KEY = 'biometric_login_username';
const BIO_LOGIN_PASSWORD_KEY = 'biometric_login_password';

export async function isBiometricLoginEnabled(): Promise<boolean> {
  return (await secureTokenStorage.getItem(BIO_LOGIN_ENABLED_KEY)) === '1';
}

/** Call only after a successful live biometric prompt (see lib/app-lock.ts). */
export async function enableBiometricLogin(username: string, password: string): Promise<void> {
  await secureTokenStorage.setItem(BIO_LOGIN_ENABLED_KEY, '1');
  await secureTokenStorage.setItem(BIO_LOGIN_USERNAME_KEY, username);
  await secureTokenStorage.setItem(BIO_LOGIN_PASSWORD_KEY, password);
}

export async function disableBiometricLogin(): Promise<void> {
  await secureTokenStorage.removeItem(BIO_LOGIN_ENABLED_KEY);
  await secureTokenStorage.removeItem(BIO_LOGIN_USERNAME_KEY);
  await secureTokenStorage.removeItem(BIO_LOGIN_PASSWORD_KEY);
}

/** Call only after a successful live biometric prompt. */
export async function getStoredLoginCredentials(): Promise<{ username: string; password: string } | null> {
  const [username, password] = await Promise.all([
    secureTokenStorage.getItem(BIO_LOGIN_USERNAME_KEY),
    secureTokenStorage.getItem(BIO_LOGIN_PASSWORD_KEY),
  ]);
  if (!username || !password) return null;
  return { username, password };
}
