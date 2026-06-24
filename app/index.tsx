import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const isDark = cs === 'dark';

  useEffect(() => {
    if (!isLoading) {
      router.replace(isAuthenticated ? '/(tabs)' : '/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const palette = {
    bg: isDark ? '#0B1120' : '#F1F5F9',
    card: isDark ? '#131E2F' : '#FFFFFF',
    text: isDark ? '#F1F5F9' : '#0F172A',
    sub: isDark ? '#475569' : '#64748B',
    divider: isDark ? '#1E2D45' : '#E2E8F0',
    footer: isDark ? '#334155' : '#CBD5E1',
    spinner: isDark ? '#475569' : '#94A3B8',
  };

  return (
    <View style={[s.root, { backgroundColor: palette.bg }]}>

      {/* Logo */}
      <View style={[s.logoCard, {
        backgroundColor: palette.card,
        shadowColor: isDark ? '#000' : '#0F172A',
      }]}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={s.logo}
          resizeMode="contain"
        />
      </View>

      {/* Identity */}
      <View style={s.identity}>
        <Text style={[s.appName, { color: palette.text }]}>Al Yafour ERP</Text>
        <Text style={[s.appSub, { color: palette.sub }]}>Enterprise Resource Planning</Text>
      </View>

      {/* Subtle divider */}
      <View style={[s.divider, { backgroundColor: palette.divider }]} />

      {/* Loading */}
      <View style={s.loaderRow}>
        <ActivityIndicator size="small" color={palette.spinner} />
        <Text style={[s.loaderText, { color: palette.sub }]}>Loading workspace…</Text>
      </View>

      {/* Footer */}
      <Text style={[s.footer, { color: palette.footer }]}>
        Al Yafour General Contracting & Transport LLC
      </Text>

    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 48,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  logoCard: {
    width: 84,
    height: 84,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 4,
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 12,
  },
  identity: { alignItems: 'center', gap: 5 },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  appSub: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  divider: {
    width: 28,
    height: 1,
    borderRadius: 1,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 13,
    fontWeight: '400',
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 30,
    fontSize: 11,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
