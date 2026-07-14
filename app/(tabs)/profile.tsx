import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/ui/AppHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || user?.email || 'User';

  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    procurement_manager: 'Procurement Manager',
    procurement_officer: 'Procurement Officer',
    finance_manager: 'Finance Manager',
    site_engineer: 'Site Engineer',
  };

  const menuItems = [
    { icon: 'gearshape.fill', label: 'Settings', route: '/settings' },
    { icon: 'bell.fill', label: 'Notifications', route: '/(tabs)/notifications' },
  ];

  const infoRows = [
    { label: 'Username', value: user?.username },
    { label: 'Email', value: user?.email },
    { label: 'Role', value: user?.role ? (roleLabel[user.role] ?? user.role) : user?.is_staff ? 'Staff' : 'User' },
    { label: 'Status', value: user?.is_active ? 'Active' : 'Inactive' },
    {
      label: 'Member Since',
      value: user?.date_joined
        ? new Date(user.date_joined).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })
        : undefined,
    },
  ].filter((r) => r.value);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader title="Profile" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* Avatar Card */}
        <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colorScheme === 'dark' ? '#1E2D45' : '#0F172A' }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
          {user?.role && (
            <View style={[styles.rolePill, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={[styles.roleText, { color: colors.textSecondary }]}>
                {roleLabel[user.role] ?? user.role}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Links */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
              style={[
                styles.menuRow,
                i < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
              ]}>
              <View style={[styles.menuIconWrap, { backgroundColor: colors.backgroundSecondary }]}>
                <IconSymbol name={item.icon as any} size={18} color={colors.textSecondary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Info */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Account Information</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {infoRows.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.infoRow,
                i < infoRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
              ]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          style={[styles.logoutBtn, { backgroundColor: colors.errorLight, borderColor: colors.error + '30' }]}>
          <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: 16,
  },
  avatarCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '55%',
    textAlign: 'right',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
