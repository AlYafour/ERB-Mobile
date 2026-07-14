import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastContainer } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Colors } from '@/constants/theme';
import { setupNotificationChannel, requestNotificationPermission } from '@/lib/notification-service';

SplashScreen.preventAutoHideAsync();

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
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
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
          <ToastContainer />
          <ConfirmDialog />
        </ThemeProvider>
      </AuthProvider>
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
