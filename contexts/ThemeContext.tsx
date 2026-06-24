import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  setColorScheme: (cs: ColorScheme) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
}

const KEYS = {
  theme: '@ay:theme',
  notifs: '@ay:notifs',
  sound: '@ay:sound',
} as const;

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'light',
  setColorScheme: () => {},
  notificationsEnabled: true,
  setNotificationsEnabled: () => {},
  soundEnabled: true,
  setSoundEnabled: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, _setColorScheme] = useState<ColorScheme>('light');
  const [notificationsEnabled, _setNotifs] = useState(true);
  const [soundEnabled, _setSound] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([KEYS.theme, KEYS.notifs, KEYS.sound])
      .then(pairs => {
        const map: Record<string, string | null> = {};
        pairs.forEach(([k, v]) => { map[k] = v; });
        if (map[KEYS.theme] === 'dark') _setColorScheme('dark');
        if (map[KEYS.notifs] === 'false') _setNotifs(false);
        if (map[KEYS.sound] === 'false') _setSound(false);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const setColorScheme = (cs: ColorScheme) => {
    _setColorScheme(cs);
    AsyncStorage.setItem(KEYS.theme, cs).catch(() => {});
  };

  const setNotificationsEnabled = (v: boolean) => {
    _setNotifs(v);
    AsyncStorage.setItem(KEYS.notifs, String(v)).catch(() => {});
  };

  const setSoundEnabled = (v: boolean) => {
    _setSound(v);
    AsyncStorage.setItem(KEYS.sound, String(v)).catch(() => {});
  };

  // Avoid flash of wrong theme before AsyncStorage hydration
  if (!hydrated) return null;

  return (
    <ThemeContext.Provider value={{
      colorScheme,
      setColorScheme,
      notificationsEnabled,
      setNotificationsEnabled,
      soundEnabled,
      setSoundEnabled,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
