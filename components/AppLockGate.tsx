import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import {
  authenticateBiometric,
  getBiometricCapabilities,
  isAppLockEnabled,
  setAppLockEnabled,
} from '@/lib/app-lock';

/**
 * Full-screen biometric gate rendered ABOVE the app content.
 *
 * Locks when:  (a) cold start with App Lock enabled and a signed-in session,
 *              (b) returning from background while enabled.
 * Unlocks only via successful biometric / device-passcode authentication.
 * Cancel or failure keeps the lock with explicit Retry / Sign out actions —
 * there is no silent bypass path.
 *
 * If biometrics became unavailable (user removed enrollment / hardware issue)
 * the gate says so and disables App Lock after an explicit sign-out — never
 * strands the user, never pretends to authenticate.
 */
export function AppLockGate() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];

  const [locked, setLocked] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biometrics');
  const [unavailable, setUnavailable] = useState(false);
  const promptInFlight = useRef(false);
  const lockedRef = useRef(false);
  lockedRef.current = locked;

  const tryUnlock = useCallback(async () => {
    if (promptInFlight.current) return;
    promptInFlight.current = true;
    try {
      const result = await authenticateBiometric('Unlock AL Yafour');
      if (result === 'success') {
        setLocked(false);
        setUnavailable(false);
      } else if (result === 'unavailable') {
        setUnavailable(true);
      }
      // 'cancelled' / 'failed' → stay locked; user retries explicitly
    } finally {
      promptInFlight.current = false;
    }
  }, []);

  // Cold start: lock if the feature is on and a session exists
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let live = true;
    (async () => {
      if (await isAppLockEnabled()) {
        const caps = await getBiometricCapabilities();
        if (!live) return;
        setBioLabel(caps.label);
        setLocked(true);
        tryUnlock();
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  // Background → re-lock; foreground → prompt if locked
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'background') {
        if (await isAppLockEnabled()) setLocked(true);
      } else if (state === 'active' && lockedRef.current) {
        tryUnlock();
      }
    });
    return () => sub.remove();
  }, [tryUnlock]);

  const handleSignOut = async () => {
    // Explicit escape hatch: signing out clears the session AND the lock
    // preference (per-session feature), landing the user on the login screen.
    await setAppLockEnabled(false);
    setLocked(false);
    await logout();
  };

  if (!locked || !isAuthenticated) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: C.background }]}>
      <View style={styles.center}>
        <View style={[styles.iconCircle, { backgroundColor: C.card, borderColor: C.border }]}>
          <Ionicons name="lock-closed" size={34} color={C.tint} />
        </View>
        <Text style={[styles.title, { color: C.text }]}>AL Yafour is locked</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          {unavailable
            ? `${bioLabel} is no longer available on this device. Sign out and sign in with your password, then re-enable App Lock from Settings.`
            : `Use ${bioLabel} to unlock`}
        </Text>

        {!unavailable && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: C.tint }]}
            onPress={tryUnlock}
            accessibilityRole="button"
            accessibilityLabel={`Unlock with ${bioLabel}`}
          >
            <Ionicons name="finger-print" size={20} color={C.primaryText} />
            <Text style={[styles.primaryBtnText, { color: C.primaryText }]}>Unlock</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={[styles.secondaryBtnText, { color: C.textSecondary }]}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 9999, elevation: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconCircle: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, minHeight: 48,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700' },
  secondaryBtn: { marginTop: 18, padding: 12, minHeight: 44, justifyContent: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
});
