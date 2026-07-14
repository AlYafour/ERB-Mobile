import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { User } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BRANDING_KEY = '@branding';

export interface Branding {
  logo_url: string;
  login_bg_url: string;
  primary_color: string;
  company_legal_name: string;
}

interface AuthContextType {
  user: User | null;
  branding: Branding | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
  }, []);

  const loadUser = async () => {
    try {
      const hasTokens = await apiClient.isAuthenticated();
      if (!hasTokens) return;

      const cachedUser = await apiClient.getCurrentUser();
      if (cachedUser) setUser(cachedUser);

      const tokenFresh = await apiClient.isAccessTokenFresh();

      if (tokenFresh) {
        // Token is valid — no need to hit Railway on startup.
        // Show the app immediately; screens will load their own data.
        // Refresh user profile in background so stale cache gets updated.
        apiClient.get<any>('/api/auth/me/').then(res => {
          if (res.data) {
            AsyncStorage.setItem('user', JSON.stringify(res.data));
            setUser(res.data);
          }
        }).catch(() => {});
      } else {
        // Token expiring or expired — must refresh before showing the app.
        await Promise.race([
          apiClient.proactiveRefresh(),
          new Promise<void>((resolve) => setTimeout(resolve, 30000)),
        ]);
      }

    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await apiClient.login(username, password);

      if (response.data && response.status >= 200 && response.status < 300) {
        let userData: any = null;
        try {
          userData = await apiClient.getCurrentUser();
        } catch {}

        if (userData) {
          setUser(userData);
        } else {
          (async () => {
            for (const delay of [2000, 4000, 8000]) {
              await new Promise<void>(r => setTimeout(r, delay));
              const stillLoggedIn = await apiClient.isAuthenticated().catch(() => false);
              if (!stillLoggedIn) return;
              try {
                const u = await apiClient.getCurrentUser();
                if (u) { setUser(u); return; }
              } catch {}
            }
          })();
        }

        // Fetch branding in background — updates logo/color for this session and next
        fetchAndCacheBranding().then(b => { if (b) setBranding(b); });

        return { success: true };
      }

      const errorMessage = response.error ||
        (response.status === 400 ? 'Invalid username or password' : 'Login failed');
      return { success: false, error: errorMessage };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
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
