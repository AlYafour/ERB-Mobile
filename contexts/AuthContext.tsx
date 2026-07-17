import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState } from 'react-native';
import { apiClient } from '@/lib/api';
import { User } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerDeviceForPush, unregisterDeviceForPush } from '@/lib/push-notifications';

const BRANDING_KEY = '@branding';

export interface Branding {
  logo_url: string;
  login_bg_url: string;
  primary_color: string;
  company_legal_name: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  /** Account has 2FA enabled — navigate to the code screen with tempToken. */
  requires2FA?: boolean;
  tempToken?: string;
  /** Seconds the temp_token stays valid (backend accounts/views.py:_2FA_TEMP_MAX_AGE). */
  expiresIn?: number;
}

interface AuthContextType {
  user: User | null;
  branding: Branding | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  verifyTwoFactor: (tempToken: string, code: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchAndCacheBranding(): Promise<Branding | null> {
  try {
    const res = await apiClient.get<Branding>('/api/tenants/me/branding/');
    if (res.data) {
      await AsyncStorage.setItem(BRANDING_KEY, JSON.stringify(res.data));
      return res.data;
    }
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient.setOnAuthCleared(() => setUser(null));
    loadUser();
    // Load cached branding immediately (shown even before login on subsequent opens)
    AsyncStorage.getItem(BRANDING_KEY).then(raw => {
      if (raw) { try { setBranding(JSON.parse(raw)); } catch {} }
    });

    // Foreground resume: if the access token expired while backgrounded,
    // refresh it BEFORE the user's next tap instead of letting the first
    // request 401. proactiveRefresh() no-ops when the token is still fresh
    // and is single-flight, so this is cheap and race-free.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        apiClient.proactiveRefresh();
      }
    });
    return () => sub.remove();
  }, []);

  const loadUser = async () => {
    try {
      const hasTokens = await apiClient.isAuthenticated();
      if (!hasTokens) return;

      const cachedUser = await apiClient.getCachedUser();

      if (cachedUser) {
        // Cached profile → show the app IMMEDIATELY. Never block startup on the
        // network: token refresh and profile sync run in the background, and the
        // global 401 handling (executeRequest → refresh → clearAuth) covers the
        // case where the session turns out to be dead.
        setUser(cachedUser);
        (async () => {
          await apiClient.proactiveRefresh();
          const res = await apiClient.get<any>('/api/auth/me/');
          if (res.data) {
            await AsyncStorage.setItem('user', JSON.stringify(res.data));
            setUser(res.data);
          }
          // Keep this device's push registration fresh (no-ops without FCM)
          registerDeviceForPush().catch(() => {});
        })().catch(() => {});
        return;
      }

      // Tokens exist but no cached profile (rare: cleared cache / interrupted
      // login). Try to resolve the profile before routing, but HARD-CAP the
      // wait at 6s — on a cold backend the unbounded await pinned the splash
      // for up to 40s. If the fetch wins later anyway, setUser still fires and
      // AuthGate moves the user in.
      await Promise.race([
        (async () => {
          await apiClient.proactiveRefresh();
          const res = await apiClient.get<any>('/api/auth/me/');
          if (res.data) {
            await AsyncStorage.setItem('user', JSON.stringify(res.data));
            setUser(res.data);
          }
        })(),
        new Promise<void>(resolve => setTimeout(resolve, 6000)),
      ]);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const response = await apiClient.login(username, password);

      if (response.data && response.status >= 200 && response.status < 300) {
        const data = response.data as any;

        // 2FA challenge — no tokens yet; the caller navigates to the code screen.
        if (data.requires_2fa) {
          return {
            success: false,
            requires2FA: true,
            tempToken: data.temp_token,
            expiresIn: typeof data.expires_in === 'number' ? data.expires_in : undefined,
          };
        }

        // The backend login response includes the full user object — use it
        // directly so `user` is set BEFORE we report success. This removes the
        // login→tabs→login bounce (AuthGate used to see user===null mid-redirect).
        let userData: any = data.user ?? null;
        if (!userData) {
          try { userData = await apiClient.getCurrentUser(); } catch {}
        }
        if (!userData) {
          // No profile — navigating would strand the user in the AuthGate
          // bounce. Fail loudly instead of succeeding into a broken state.
          await apiClient.logout().catch(() => {});
          return { success: false, error: 'Could not load your profile. Please try again.' };
        }
        setUser(userData);

        // Background: branding + push-device registration (both non-blocking)
        fetchAndCacheBranding().then(b => { if (b) setBranding(b); });
        registerDeviceForPush().catch(() => {});

        return { success: true };
      }

      const errorMessage = response.error ||
        (response.status === 400 ? 'Invalid username or password' : 'Login failed');
      return { success: false, error: errorMessage };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const verifyTwoFactor = async (tempToken: string, code: string) => {
    try {
      const response = await apiClient.verify2FA(tempToken, code);
      if (response.data && response.status >= 200 && response.status < 300) {
        const userData = (response.data as any).user ?? (await apiClient.getCurrentUser());
        if (!userData) {
          await apiClient.logout().catch(() => {});
          return { success: false, error: 'Could not load your profile. Please try again.' };
        }
        setUser(userData);
        fetchAndCacheBranding().then(b => { if (b) setBranding(b); });
        registerDeviceForPush().catch(() => {});
        return { success: true };
      }
      return { success: false, error: response.error || 'Invalid or expired code.' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Verification failed' };
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await apiClient.register(userData);
      if (response.data) {
        // Account is created but inactive (pending admin approval) — do not auto-login
        return { success: true };
      }
      return { success: false, error: response.error || 'Registration failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      // App Lock is a per-session preference — clear it with the session so
      // the next account never inherits the previous user's lock state.
      const { setAppLockEnabled } = await import('@/lib/app-lock');
      await setAppLockEnabled(false).catch(() => {});
      // Deactivate this device's push registration BEFORE the tokens are
      // cleared (the DELETE needs auth) — the next account on this device
      // must never receive the previous user's notifications.
      await unregisterDeviceForPush().catch(() => {});
      await apiClient.logout();
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        branding,
        isLoading,
        isAuthenticated: !!user,
        login,
        verifyTwoFactor,
        register,
        logout,
        refreshUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
