import React, { ReactNode } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppButton } from '@/components/ui/AppButton';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface AppPermissionGateProps {
  /** Two-arg permission check: hasPermission(category, action). */
  category?: string;
  action?: string;
  /** Pass if ANY of these pairs is granted (used with or instead of category/action). */
  anyOf?: { category: string; action: string }[];
  /** Restrict to tenant/platform admins (web parity for admin-only pages). */
  adminOnly?: boolean;
  children: ReactNode;
}

/**
 * Screen-level permission guard.
 *
 * While permissions load it shows a spinner INSTEAD of flashing the denied
 * state (the old per-screen hooks returned false during load, which is what
 * made buttons/screens flicker). When denied it renders a clear access-denied
 * state with a way back — it never silently renders a broken screen.
 */
export function AppPermissionGate({
  category,
  action,
  anyOf,
  adminOnly = false,
  children,
}: AppPermissionGateProps) {
  const { isLoading, isAdmin, hasPermission, hasAnyPermission } = usePermissionsContext();
  const router = useRouter();
  const cs = useColorScheme();
  const C = Colors[cs];

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  let allowed = isAdmin;
  if (!allowed && !adminOnly) {
    if (category && action) allowed = hasPermission(category, action);
    if (!allowed && anyOf?.length) allowed = hasAnyPermission(anyOf);
  }

  if (!allowed) {
    return (
      <View style={[s.center, { backgroundColor: C.background }]}>
        <View style={[s.iconWrap, { backgroundColor: C.dangerBg }]}>
          <IconSymbol name="lock.fill" size={28} color={C.danger} />
        </View>
        <Text style={[s.title, { color: C.textPrimary }]}>Access Denied</Text>
        <Text style={[s.sub, { color: C.textSecondary }]}>
          You don&apos;t have permission to view this screen.{'\n'}
          Contact your administrator if you believe this is a mistake.
        </Text>
        <AppButton
          title="Go Back"
          variant="outline"
          size="md"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={{ marginTop: 20, minWidth: 160 }}
        />
      </View>
    );
  }

  return <>{children}</>;
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  sub: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
