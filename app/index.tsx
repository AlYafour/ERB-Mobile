import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown,
  SlideOutDown 
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { Spacing, Typography } from '@/constants/spacing';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500); // Small delay for better UX
      } else {
        setTimeout(() => {
          router.replace('/login');
        }, 1500);
      }
    }
  }, [isAuthenticated, isLoading, router]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <LinearGradient
      colors={[Colors.light.tint, Colors.light.tintSecondary, Colors.light.tintDark]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <AnimatedView 
        entering={FadeIn.duration(800)}
        exiting={FadeOut.duration(500)}
        style={styles.content}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <ThemedText style={styles.logoText}>PRM</ThemedText>
          </View>
        </View>

        <AnimatedView 
          entering={SlideInDown.delay(300).duration(600)}
          exiting={SlideOutDown.duration(400)}
          style={styles.loadingContainer}
        >
          <ActivityIndicator 
            size="large" 
            color="#FFFFFF" 
            style={styles.spinner}
          />
          
          <ThemedText style={styles.welcomeText}>
            Welcome to Procurement Pro
          </ThemedText>
          
          {user?.first_name && (
            <ThemedText style={styles.userGreeting}>
              {getGreeting()}, {user.first_name}!
            </ThemedText>
          )}
          
          <ThemedText style={styles.loadingText}>
            Preparing your dashboard...
          </ThemedText>
        </AnimatedView>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Premium Procurement Management System
          </ThemedText>
          <ThemedText style={styles.versionText}>
            Version 2.0.1 • Premium Edition
          </ThemedText>
        </View>
      </AnimatedView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 60 : 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  spinner: {
    marginBottom: Spacing.xl,
    transform: [{ scale: 1.3 }],
  },
  welcomeText: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  userGreeting: {
    fontSize: Typography.sizes.xl,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.lg,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: Spacing.sm,
  },
  versionText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

