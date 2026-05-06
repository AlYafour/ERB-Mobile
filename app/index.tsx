import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      router.replace(isAuthenticated ? '/(tabs)' : '/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>ERB</Text>
          </View>
        </View>

        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color="#FFFFFF" style={{ marginBottom: 28 }} />
          <Text style={styles.appName}>Procurement Pro</Text>
          {user?.first_name && (
            <Text style={styles.userGreeting}>{greeting()}, {user.first_name}</Text>
          )}
          <Text style={styles.loadingLabel}>Loading your workspace…</Text>
        </View>

        <Text style={styles.footer}>Al Yafour General Contracting & Transport</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.tint,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 70 : 48,
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  centerBlock: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  userGreeting: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 16,
  },
  loadingLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
  },
  footer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
});
