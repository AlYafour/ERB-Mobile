import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ErrorBoundaryProps } from 'expo-router';

import { Colors } from '@/constants/theme';

/**
 * Root error boundary (expo-router convention: exported as ErrorBoundary
 * from app/_layout.tsx). Before this existed, any unhandled render error
 * white-screened the app with no recovery path.
 *
 * Kept theme-static (light palette) on purpose: it must render even when
 * providers above it crashed, so it cannot depend on ThemeContext.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const C = Colors.light;
  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={styles.center}>
        <View style={[styles.iconCircle, { backgroundColor: C.card, borderColor: C.border }]}>
          <Ionicons name="alert-circle-outline" size={36} color={C.danger} />
        </View>
        <Text style={[styles.title, { color: C.text }]}>Something went wrong</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          The screen hit an unexpected error. Your data is safe — try again, and
          if it keeps happening contact IT support.
        </Text>

        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: C.tint }]}
          onPress={retry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>

        {__DEV__ && (
          <ScrollView style={[styles.devBox, { borderColor: C.border }]}>
            <Text style={[styles.devText, { color: C.textSecondary }]}>
              {error.message}
              {'\n\n'}
              {error.stack}
            </Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  iconCircle: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 26 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 26, paddingVertical: 13, borderRadius: 14, minHeight: 48,
  },
  retryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  devBox: { maxHeight: 220, marginTop: 24, alignSelf: 'stretch', borderWidth: 1, borderRadius: 10, padding: 12 },
  devText: { fontSize: 11, fontFamily: 'monospace' },
});
