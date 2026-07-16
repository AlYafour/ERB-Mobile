import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, I18nManager } from 'react-native';
import 'react-native-reanimated';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

import { AppThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { AuthGate } from '@/components/AuthGate';
import { AppLockGate } from '@/components/AppLockGate';
import { ToastContainer } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Colors } from '@/constants/theme';
import { setupNotificationChannel, requestNotificationPermission } from '@/lib/notification-service';

export { AppErrorBoundary as ErrorBoundary } from '@/components/AppErrorBoundary';

SplashScreen.preventAutoHideAsync();

// RTL groundwork: let the OS mirror layout for RTL locales (Arabic).
// Components must use start/end (not left/right) spacing for this to hold.
I18nManager.allowRTL(true);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mobile networks flake — one automatic retry, then surface the error
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// TanStack Query ↔ React Native wiring:
// online status from NetInfo (pauses/resumes queries with connectivity),
// focus from AppState (refetch-on-focus fires on foreground, not tab switches).
onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => setOnline(!!state.isConnected))
);

const PremiumLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: Colors.light.danger,
  },
};


const PremiumDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.danger,
  },
};

export const unstable_settings = {
  initialRouteName: 'index',
};

// Inner layout — safe to call useColorScheme() here because AppThemeProvider is above
function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const activeTheme = isDark ? PremiumDarkTheme : PremiumLightTheme;

  useEffect(() => {
    setupNotificationChannel();
    requestNotificationPermission();

    const sub = AppState.addEventListener('change', state => {
      focusManager.setFocused(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionsProvider>
        <ThemeProvider value={activeTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: activeTheme.colors.background,
              },
            }}
          />
          <StatusBar
            style={isDark ? 'light' : 'dark'}
            backgroundColor={isDark ? Colors.dark.background : Colors.light.background}
            translucent={false}
          />
          <AuthGate />
          <ToastContainer />
          <ConfirmDialog />
          <AppLockGate />
        </ThemeProvider>
        </PermissionsProvider>
      </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({});

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppThemeProvider>
      <RootLayoutInner />
    </AppThemeProvider>
  );
}
