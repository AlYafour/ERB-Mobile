import { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Image, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width } = Dimensions.get('window');
const CARD = (width - 48) / 2;

interface Module {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  color: string;
  bgLight: string;
  bgDark: string;
  route: string | null;
  available: boolean;
}

const MODULES: Module[] = [
  {
    id: 'procurement',
    label: 'Procurement',
    subtitle: 'LPO · PR · GRN · Quotations',
    icon: 'cart.fill',
    color: '#3b82f6',
    bgLight: '#eff6ff',
    bgDark: '#172030',
    route: '/purchase-requests',
    available: true,
  },
  {
    id: 'hr',
    label: 'Human Resources',
    subtitle: 'Attendance · Leave · Payroll',
    icon: 'person.2.fill',
    color: '#f97316',
    bgLight: '#fff7ed',
    bgDark: '#2a1400',
    route: '/(tabs)/hr',
    available: true,
  },
  {
    id: 'sales',
    label: 'Sales',
    subtitle: 'Invoices · Clients · Pipeline',
    icon: 'chart.bar.fill',
    color: '#10b981',
    bgLight: '#f0fdf4',
    bgDark: '#0a1f18',
    route: null,
    available: false,
  },
  {
    id: 'accounts',
    label: 'Accounts',
    subtitle: 'Ledger · Reports · Payables',
    icon: 'dollarsign.circle.fill',
    color: '#8b5cf6',
    bgLight: '#faf5ff',
    bgDark: '#1a1030',
    route: null,
    available: false,
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const cs = useColorScheme() ?? 'light';
  const colors = Colors[cs];
  const isDark = cs === 'dark';

  const logoScale   = useSharedValue(0.25);
  const logoOpacity = useSharedValue(0);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 550 });
    logoScale.value   = withSpring(1, { damping: 13, stiffness: 85 });
  }, []);

  const firstName = user?.first_name || user?.username || '';

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo hero ── */}
        <View style={s.hero}>
          <Animated.View
            style={[
              s.logoRing,
              logoStyle,
              { backgroundColor: isDark ? '#1e2d45' : '#ffffff' },
            ]}
          >
            <Image
              source={require('@/assets/images/icon.png')}
              style={s.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(500)} style={s.heroText}>
            <Text style={[s.companyLine1, { color: colors.text }]}>
              AL YAFOUR GEN. CONT.
            </Text>
            <Text style={[s.companyLine2, { color: colors.tint }]}>
              {'& TRANSPORT LLC.'}
            </Text>
          </Animated.View>
        </View>

        {/* ── Greeting card ── */}
        <Animated.View
          entering={FadeInDown.delay(550).duration(450)}
          style={[s.greetCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[s.greetHi, { color: colors.textSecondary }]}>
              {getGreeting()}{firstName ? ',' : ''}{' '}
            </Text>
            {firstName ? (
              <Text style={[s.greetName, { color: colors.text }]}>
                {firstName} 👋
              </Text>
            ) : (
              <Text style={[s.greetName, { color: colors.text }]}>Welcome 👋</Text>
            )}
          </View>
          <TouchableOpacity
            style={[s.notifBtn, { backgroundColor: colors.tintSubtle }]}
            onPress={() => router.push('/(tabs)/notifications' as any)}
          >
            <IconSymbol name="bell.fill" size={18} color={colors.tint} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Section label ── */}
        <Animated.Text
          entering={FadeIn.delay(720).duration(350)}
          style={[s.sectionLabel, { color: colors.textSecondary }]}
        >
          SELECT A MODULE
        </Animated.Text>

        {/* ── Module grid ── */}
        <View style={s.grid}>
          {MODULES.map((mod, idx) => (
            <Animated.View
              key={mod.id}
              entering={FadeInDown.delay(820 + idx * 100).duration(420).springify()}
              style={{ width: CARD }}
            >
              <TouchableOpacity
                style={[
                  s.card,
                  {
                    backgroundColor: isDark ? mod.bgDark : mod.bgLight,
                    borderColor: mod.available ? mod.color + '50' : colors.border,
                    opacity: mod.available ? 1 : 0.52,
                  },
                ]}
                onPress={() => {
                  if (mod.available && mod.route) {
                    router.push(mod.route as any);
                  }
                }}
                activeOpacity={mod.available ? 0.7 : 1}
              >
                {/* Color accent strip */}
                <View style={[s.accentBar, { backgroundColor: mod.color }]} />

                {/* Icon bubble */}
                <View style={[s.iconBubble, { backgroundColor: mod.color + '20' }]}>
                  <IconSymbol name={mod.icon as any} size={28} color={mod.color} />
                </View>

                {/* Text */}
                <Text style={[s.cardLabel, { color: colors.text }]} numberOfLines={2}>
                  {mod.label}
                </Text>
                <Text style={[s.cardSub, { color: colors.textSecondary }]} numberOfLines={2}>
                  {mod.subtitle}
                </Text>

                {/* Footer */}
                <View style={s.cardFooter}>
                  {mod.available ? (
                    <View style={[s.openBtn, { backgroundColor: mod.color }]}>
                      <Text style={s.openBtnText}>Open</Text>
                      <IconSymbol name="chevron.right" size={10} color="#fff" />
                    </View>
                  ) : (
                    <View style={[s.soonBadge, { borderColor: colors.border }]}>
                      <Text style={[s.soonText, { color: colors.textSecondary }]}>
                        Coming soon
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* ── Profile shortcut ── */}
        <Animated.View entering={FadeIn.delay(1250).duration(450)}>
          <TouchableOpacity
            style={[s.profileRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/profile' as any)}
            activeOpacity={0.75}
          >
            <View style={[s.avatarCircle, { backgroundColor: colors.tint }]}>
              <Text style={s.avatarText}>
                {(user?.first_name || user?.username || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.profileName, { color: colors.text }]}>
                {user?.first_name
                  ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
                  : user?.username || 'My Profile'}
              </Text>
              <Text style={[s.profileRole, { color: colors.textSecondary }]}>
                {user?.role?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Employee'}
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Footer ── */}
        <Animated.Text
          entering={FadeIn.delay(1400).duration(500)}
          style={[s.footer, { color: colors.textSecondary }]}
        >
          Abu Dhabi, United Arab Emirates
        </Animated.Text>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.10,
  shadowRadius: 12,
  elevation: 5,
};

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 12, paddingHorizontal: 16 },

  /* Hero */
  hero: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 22,
  },
  logoRing: {
    width: 104,
    height: 104,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  logo: { width: 76, height: 76 },
  heroText: { alignItems: 'center', marginTop: 16, gap: 2 },
  companyLine1: { fontSize: 14, fontWeight: '800', letterSpacing: 0.6, textAlign: 'center' },
  companyLine2: { fontSize: 14, fontWeight: '800', letterSpacing: 0.6, textAlign: 'center' },

  /* Greeting */
  greetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
    gap: 12,
    ...SHADOW,
    shadowOpacity: 0.05,
  },
  greetHi: { fontSize: 13, fontWeight: '500' },
  greetName: { fontSize: 21, fontWeight: '800', letterSpacing: -0.4, marginTop: 1 },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Section label */
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 13,
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  /* Card */
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    paddingBottom: 16,
    ...SHADOW,
    shadowOpacity: 0.08,
  },
  accentBar: { height: 5, width: '100%', marginBottom: 16 },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 14,
    marginBottom: 5,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 11,
    paddingHorizontal: 14,
    marginBottom: 14,
    lineHeight: 16,
  },
  cardFooter: { paddingHorizontal: 14 },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  openBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  soonBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  soonText: { fontSize: 11, fontWeight: '600' },

  /* Profile row */
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
    ...SHADOW,
    shadowOpacity: 0.05,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  profileName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  profileRole: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },

  /* Footer */
  footer: {
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
});
