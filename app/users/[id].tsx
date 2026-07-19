import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, ModuleTints } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppSkeletonList } from '@/components/ui/AppSkeleton';
import { AppPermissionGate } from '@/components/AppPermissionGate';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  procurement_officer: 'Procurement Officer',
  hr_officer: 'HR Officer',
  accountant: 'Accountant',
  viewer: 'Viewer',
  employee: 'Employee',
};

interface InfoRowProps {
  icon: string;
  label: string;
  value: string | undefined | null;
  c: typeof Colors.light;
}

function InfoRow({ icon, label, value, c }: InfoRowProps) {
  if (!value) return null;
  return (
    <View style={[infoRow.wrap, { borderBottomColor: c.border }]}>
      <View style={[infoRow.iconWrap, { backgroundColor: c.surfaceMuted }]}>
        <IconSymbol name={icon as any} size={16} color={c.textMuted} />
      </View>
      <View style={infoRow.body}>
        <Text style={[infoRow.label, { color: c.textMuted }]}>{label}</Text>
        <Text style={[infoRow.value, { color: c.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}

function UserDetailScreenInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const cs = useColorScheme();
  const c = Colors[cs] as typeof Colors.light;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) { setError('Invalid user ID'); setLoading(false); setRefreshing(false); return; }
    try {
      setError(null);
      const u = await usersApi.getById(id);
      setUser(u);
    } catch (e: any) {
      setError(e.message || 'Failed to load user');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  // Stale-detail fix: refetch when the screen regains focus (a child
  // flow - edit, permission changes - can change this record while this
  // screen stays mounted underneath).
  useRefetchOnFocus(load);

  const onRefresh = () => { setRefreshing(true); load(); };
  const pullToRefresh = usePullToRefresh(refreshing, onRefresh);

  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || user.email
    : '';

  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role.replace(/_/g, ' ').replace(/\b\w/g, (ch: string) => ch.toUpperCase())) : null;

  const joinDate = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const lastLogin = user?.last_login
    ? new Date(user.last_login).toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.background }]} edges={['top']}>
      <AppHeader title="User Details" showBack={true} />

      {loading ? (
        <AppSkeletonList count={3} lines={4} />
      ) : error || !user ? (
        <AppEmptyState
          variant="error"
          title="User not found"
          message={error ?? 'The requested user could not be loaded.'}
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: 48 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={pullToRefresh}
        >
          {/* ── Avatar hero ── */}
          <View style={[s.hero, { backgroundColor: c.primary }]}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {(user.first_name?.[0] || user.username?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </Text>
            </View>
            <Text style={s.heroName} numberOfLines={1}>{fullName}</Text>
            {roleLabel && <Text style={s.heroRole}>{roleLabel}</Text>}
            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: user.is_active ? c.successBg : c.dangerBg }]}>
                <View style={[s.badgeDot, { backgroundColor: user.is_active ? c.success : c.danger }]} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: user.is_active ? c.successText : c.errorText }}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
              {user.is_staff && (
                <View style={[s.badge, { backgroundColor: c.infoBg }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.info }}>Staff</Text>
                </View>
              )}
              {user.is_superuser && (
                <View style={[s.badge, { backgroundColor: ModuleTints[cs].admin.bg }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: ModuleTints[cs].admin.fg }}>Superuser</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Account info ── */}
          <Text style={[s.sectionLabel, { color: c.textMuted }]}>ACCOUNT INFORMATION</Text>
          <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <InfoRow icon="envelope.fill"       label="Email"      value={user.email}    c={c} />
            <InfoRow icon="person.fill"          label="Username"   value={user.username} c={c} />
            <InfoRow icon="number"               label="User ID"    value={String(user.id)} c={c} />
            <InfoRow icon="person.badge.key.fill" label="Role"     value={roleLabel}     c={c} />
            <InfoRow icon="calendar.badge.plus"  label="Joined"    value={joinDate}      c={c} />
            <InfoRow icon="clock.fill"           label="Last Login" value={lastLogin}    c={c} />
          </View>

          {/* ── Permissions summary ── */}
          {(user.is_staff || user.is_superuser) && (
            <>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>ACCESS LEVEL</Text>
              <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                {user.is_superuser && (
                  <View style={[s.accessRow, { borderBottomColor: c.border }]}>
                    <View style={[s.accessIcon, { backgroundColor: ModuleTints[cs].admin.bg }]}>
                      <IconSymbol name="checkmark.shield.fill" size={16} color={ModuleTints[cs].admin.fg} />
                    </View>
                    <Text style={[s.accessLabel, { color: c.textPrimary }]}>Full system access (Superuser)</Text>
                  </View>
                )}
                {user.is_staff && !user.is_superuser && (
                  <View style={[s.accessRow, { borderBottomColor: c.border }]}>
                    <View style={[s.accessIcon, { backgroundColor: c.infoBg }]}>
                      <IconSymbol name="person.badge.shield.checkmark.fill" size={16} color={c.info} />
                    </View>
                    <Text style={[s.accessLabel, { color: c.textPrimary }]}>Staff (admin panel access)</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const infoRow = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: { flex: 1 },
  label: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 14, fontWeight: '500' },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  hero: {
    marginBottom: 4,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  heroName: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.4 },
  heroRole: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accessIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessLabel: { fontSize: 14, fontWeight: '500' },
});


export default function UserDetailScreen() {
  return (
    <AppPermissionGate category="user" action="view">
      <UserDetailScreenInner />
    </AppPermissionGate>
  );
}
