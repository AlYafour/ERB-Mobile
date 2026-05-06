import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius, Typography } from '@/constants/spacing';
import { Layout } from '@/constants/layout';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      
      // Only redirect if login was successful
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        // Show detailed error message - don't redirect
        const errorMsg = result.error || 'Login failed. Please check your credentials.';
        setError(errorMsg);
        console.error('Login failed:', result);
      }
    } catch (err: any) {
      // Don't redirect on error
      const errorMsg = err.message || 'An error occurred. Please try again.';
      setError(errorMsg);
      console.error('Login exception:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}>
          <View style={styles.logoContainer}>
            <Logo size={120} />
          </View>
          <ThemedText type="title" style={styles.title}>
            AL Yafour Procurement
          </ThemedText>
          <ThemedText style={styles.subtitle}>مرحباً — سجّل دخولك للمتابعة</ThemedText>

          {error ? (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            autoCapitalize="none"
            autoComplete="username"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            fullWidth
            style={styles.button}
          />

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>Don't have an account? </ThemedText>
            <ThemedText
              type="link"
              onPress={() => router.push('/register')}
              style={styles.linkText}>
              Sign Up
            </ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Layout.screenPadding,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
    textAlign: 'center',
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.5,
    color: Colors.light.text,
  },
  subtitle: {
    marginBottom: Spacing.xl,
    textAlign: 'center',
    fontSize: Typography.sizes.base,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weights.normal,
  },
  errorContainer: {
    backgroundColor: Colors.light.errorLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Layout.formGroupMarginBottom,
    borderWidth: 1,
    borderColor: Colors.light.error,
  },
  errorText: {
    color: Colors.light.error,
    textAlign: 'center',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  button: {
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Layout.sectionMarginTop,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: Typography.sizes.base,
    color: Colors.light.text,
    fontWeight: Typography.weights.normal,
  },
  linkText: {
    fontSize: Typography.sizes.base,
    color: Colors.light.tint,
    fontWeight: Typography.weights.semibold,
  },
});

