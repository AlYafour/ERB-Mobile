import { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { IconSymbol } from '@/components/ui/icon-symbol';

const CODE_LENGTH = 6;

/**
 * Two-factor verification screen.
 * Reached from login when the backend responds { requires_2fa, temp_token }.
 * POSTs /api/auth/2fa/verify/ { temp_token, code } via AuthContext.verifyTwoFactor.
 * The temp token is single-use and short-lived — on expiry the user must sign in again.
 */
export default function TwoFactorScreen() {
  const { tempToken } = useLocalSearchParams<{ tempToken: string }>();
  const { verifyTwoFactor, branding } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const brandColor = branding?.primary_color || '#C9943A';

  const handleVerify = async (value?: string) => {
    const submitted = (value ?? code).trim();
    if (submitted.length !== CODE_LENGTH || loading) return;
    setError('');
    setLoading(true);
    try {
      const result = await verifyTwoFactor(String(tempToken ?? ''), submitted);
      if (result.success) {
        // AuthGate navigates once `user` is set — no manual replace here.
      } else {
        setError(result.error || 'Invalid or expired code.');
        setCode('');
        inputRef.current?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const onChangeCode = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) handleVerify(digits);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#07111F" />
      <KeyboardAvoidingView
        // Android: rely on the window's adjustResize — 'height' visibly
        // re-lays-out the whole screen on every keyboard open/close.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[s.content, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 32 }]}>
          <View style={s.logoWrap}>
            <Logo size={56} logoUrl={branding?.logo_url || undefined} />
          </View>

          <View style={s.card}>
            <Text style={s.title}>Two-Factor Verification</Text>
            <Text style={s.sub}>
              Enter the {CODE_LENGTH}-digit code from your authenticator app
            </Text>

            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* The real input is an invisible layer COVERING the boxes — a
                1×1px offscreen input broke backspace on several Android
                keyboards (deleting a mistyped digit was impossible). Tapping
                anywhere on the boxes focuses the native input directly. */}
            <View style={s.codeArea}>
              <View style={s.digitsRow} pointerEvents="none">
                {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      s.digitBox,
                      i === code.length && !loading && { borderColor: brandColor },
                    ]}
                  >
                    <Text style={s.digit}>{code[i] ?? ''}</Text>
                  </View>
                ))}
              </View>
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={onChangeCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={CODE_LENGTH}
                autoFocus
                caretHidden
                style={s.overlayInput}
                accessibilityLabel={`Verification code, ${CODE_LENGTH} digits`}
                editable={!loading}
              />
            </View>

            {/* Explicit backspace — never leave the user unable to correct */}
            <View style={s.editRow}>
              <TouchableOpacity
                onPress={() => { setCode(c => c.slice(0, -1)); setError(''); inputRef.current?.focus(); }}
                disabled={loading || code.length === 0}
                style={[s.editBtn, (loading || code.length === 0) && { opacity: 0.4 }]}
                accessibilityRole="button"
                accessibilityLabel="Delete last digit"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol name="delete.left" size={18} color="#94A3B8" />
                <Text style={s.editBtnText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setCode(''); setError(''); inputRef.current?.focus(); }}
                disabled={loading || code.length === 0}
                style={[s.editBtn, (loading || code.length === 0) && { opacity: 0.4 }]}
                accessibilityRole="button"
                accessibilityLabel="Clear code"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol name="xmark.circle.fill" size={18} color="#94A3B8" />
                <Text style={s.editBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                s.btn,
                { backgroundColor: brandColor },
                (loading || code.length !== CODE_LENGTH) && s.btnDisabled,
              ]}
              onPress={() => handleVerify()}
              disabled={loading || code.length !== CODE_LENGTH}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Verify code"
              accessibilityState={{ disabled: loading || code.length !== CODE_LENGTH, busy: loading }}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={s.btnText}>Verify</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/login')}
              style={s.backLink}
              accessibilityRole="link"
              accessibilityLabel="Back to sign in"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.backText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>
            The code changes every 30 seconds. If it keeps failing, sign in again to get a new session.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07111F' },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'stretch' },
  logoWrap: { alignItems: 'center', marginBottom: 28 },

  card: {
    backgroundColor: '#0D1B2A',
    borderColor: '#1E3349',
    borderWidth: 1,
    borderRadius: 22,
    padding: 28,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#F8FAFC', marginBottom: 4 },
  sub: { fontSize: 13, color: '#64748B', marginBottom: 22 },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.28)',
  },
  errorText: { color: '#FCA5A5', fontSize: 13, fontWeight: '500', textAlign: 'center' },

  codeArea: { position: 'relative', marginBottom: 10 },
  digitsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  digitBox: {
    flex: 1,
    aspectRatio: 0.82,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1E3349',
    backgroundColor: '#0A1624',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontSize: 24, fontWeight: '700', color: '#F8FAFC' },
  overlayInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
    color: 'transparent',
    fontSize: 1,
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 14,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  editBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

  btn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  backLink: { alignItems: 'center', marginTop: 18, minHeight: 44, justifyContent: 'center' },
  backText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },

  hint: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
