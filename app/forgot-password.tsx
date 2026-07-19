import { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Step = 'request' | 'confirm' | 'done';

type Palette = typeof Colors.light | typeof Colors.dark;

/**
 * Forgot-password flow. Two backend calls, no session established:
 *   POST /api/auth/password-reset/request/ { username } -> { reset_token }
 *   POST /api/auth/password-reset/confirm/ { reset_token, code, new_password }
 * The user signs in fresh afterward — this screen never stores tokens.
 */
export default function ForgotPasswordScreen() {
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const s = useMemo(() => makeStyles(C), [C]);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { branding } = useAuth();
  const brandColor = branding?.primary_color || C.primary;

  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!identifier.trim()) { setError('Enter your username or email'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.requestPasswordReset(identifier.trim());
      if (res.data?.reset_token) {
        setResetToken(res.data.reset_token);
        setStep('confirm');
      } else {
        setError(res.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (code.trim().length !== 6) { setError('Enter the 6-digit code from your email'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.confirmPasswordReset(resetToken, code.trim(), newPassword);
      if (res.status >= 200 && res.status < 300) {
        setStep('done');
      } else {
        // Django's password validators return a list of messages
        const detail = Array.isArray(res.data && (res.data as any).error)
          ? (res.data as any).error.join(' ')
          : res.error;
        setError(detail || 'Could not reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle={cs === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={C.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.logoWrap}>
            <Logo size={56} logoUrl={branding?.logo_url || undefined} />
          </View>

          <View style={s.card}>
            {step === 'request' && (
              <>
                <Text style={s.title}>Reset Password</Text>
                <Text style={s.sub}>Enter your username or email and we&apos;ll send you a reset code.</Text>

                {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

                <Input
                  label="Username or Email"
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="Enter your username or email"
                  autoCapitalize="none"
                  autoComplete="username"
                  returnKeyType="done"
                  onSubmitEditing={handleRequest}
                  containerStyle={s.field}
                />

                <TouchableOpacity
                  style={[s.btn, { backgroundColor: brandColor }, loading && s.btnDisabled]}
                  onPress={handleRequest}
                  disabled={loading}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel="Send reset code"
                  accessibilityState={{ disabled: loading, busy: loading }}
                >
                  {loading ? <ActivityIndicator color={C.primaryText} size="small" /> : <Text style={s.btnText}>Send Reset Code</Text>}
                </TouchableOpacity>
              </>
            )}

            {step === 'confirm' && (
              <>
                <Text style={s.title}>Enter Code</Text>
                <Text style={s.sub}>
                  If an account exists for &quot;{identifier.trim()}&quot;, a 6-digit code was emailed to it. It expires in 15 minutes.
                </Text>

                {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

                <Input
                  label="Reset Code"
                  value={code}
                  onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  containerStyle={s.field}
                />

                <Input
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 8 characters"
                  secureTextEntry
                  secureToggle
                  autoCapitalize="none"
                  autoComplete="password-new"
                  containerStyle={s.field}
                />

                <Input
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  secureTextEntry
                  secureToggle
                  autoCapitalize="none"
                  autoComplete="password-new"
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm}
                  containerStyle={s.field}
                />

                <TouchableOpacity
                  style={[s.btn, { backgroundColor: brandColor }, loading && s.btnDisabled]}
                  onPress={handleConfirm}
                  disabled={loading}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel="Reset password"
                  accessibilityState={{ disabled: loading, busy: loading }}
                >
                  {loading ? <ActivityIndicator color={C.primaryText} size="small" /> : <Text style={s.btnText}>Reset Password</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.backLink}
                  onPress={() => { setStep('request'); setCode(''); setError(''); }}
                  accessibilityRole="button"
                  accessibilityLabel="Use a different account"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={s.backText}>Use a different account</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'done' && (
              <>
                <View style={s.successBox}>
                  <IconSymbol name="checkmark.circle.fill" size={28} color={C.success} />
                  <Text style={s.successText}>Your password has been reset. Please sign in with your new password.</Text>
                </View>
                <TouchableOpacity
                  style={[s.btn, { backgroundColor: brandColor }]}
                  onPress={() => router.replace('/login')}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel="Back to sign in"
                >
                  <Text style={s.btnText}>Back to Sign In</Text>
                </TouchableOpacity>
              </>
            )}

            {step !== 'done' && (
              <TouchableOpacity
                style={s.backLink}
                onPress={() => router.replace('/login')}
                accessibilityRole="link"
                accessibilityLabel="Back to sign in"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.backText}>Back to Sign In</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 28 },

  card: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 28,
  },
  title: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  sub: { fontSize: 13, color: C.textMuted, marginBottom: 22, lineHeight: 19 },

  errorBox: {
    backgroundColor: C.dangerBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${C.danger}47`,
  },
  errorText: { color: C.errorText, fontSize: 13, fontWeight: '500', textAlign: 'center' },

  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: C.successBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: `${C.success}47`,
  },
  successText: { flex: 1, color: C.successText, fontSize: 14, lineHeight: 20 },

  field: { marginBottom: 14 },

  btn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: C.primaryText, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  backLink: { alignItems: 'center', marginTop: 18, minHeight: 44, justifyContent: 'center' },
  backText: { color: C.textMuted, fontSize: 14, fontWeight: '600' },
});
