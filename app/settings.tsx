import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch,
  TouchableOpacity, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppHeader } from '@/components/ui/AppHeader';

const appVersion = Constants.expoConfig?.version ?? '1.0.0';
const buildNumber =
  Platform.OS === 'ios'
    ? Constants.expoConfig?.ios?.buildNumber
    : Constants.expoConfig?.android?.versionCode;

interface SettingRowProps {
  icon: string;
  iconColor: string;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  c: typeof Colors.light;
}

function SettingRow({ icon, iconColor, label, description, value, onValueChange, c }: SettingRowProps) {
  return (
    <View style={[row.wrap, { borderBottomColor: c.border }]}>
      <View style={[row.iconWrap, { backgroundColor: iconColor + '15' }]}>
        <IconSymbol name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={row.body}>
        <Text style={[row.label, { color: c.textPrimary }]}>{label}</Text>
        <Text style={[row.desc, { color: c.textMuted }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: c.border, true: c.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={c.border}
      />
    </View>
  );
}

interface InfoRowProps {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  c: typeof Colors.light;
  onPress?: () => void;
}

function InfoRow({ icon, iconColor, label, value, c, onPress }: InfoRowProps) {
  const Inner = (
    <View style={[row.wrap, { borderBottomColor: c.border }]}>
      <View style={[row.iconWrap, { backgroundColor: iconColor + '15' }]}>
        <IconSymbol name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={row.body}>
        <Text style={[row.label, { color: c.textPrimary }]}>{label}</Text>
        <Text style={[row.desc, { color: c.textMuted }]}>{value}</Text>
      </View>
      {onPress && <IconSymbol name="chevron.right" size={16} color={c.textMuted} />}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.65}>
        {Inner}
      </TouchableOpacity>
    );
  }
  return Inner;
}

export default function SettingsScreen() {
  const router = useRouter();
  const cs = useColorScheme();
  const c = Colors[cs] as typeof Colors.light;
  const { colorScheme, setColorScheme, notificationsEnabled, setNotificationsEnabled, soundEnabled, setSoundEnabled } = useAppTheme();

  const handleDarkMode = (v: boolean) => {
    setColorScheme(v ? 'dark' : 'light');
  };

  const handleNotifications = (v: boolean) => {
    setNotificationsEnabled(v);
    if (v) {
      Alert.alert(
        'Notifications Enabled',
        'You will receive in-app alerts for approvals, updates, and reminders.',
        [{ text: 'OK' }],
      );
    }
  };

  const handleSound = (v: boolean) => {
    setSoundEnabled(v);
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.background }]} edges={['top']}>
      <AppHeader title="Settings" />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Appearance ── */}
        <Text style={[s.sectionLabel, { color: c.textMuted }]}>APPEARANCE</Text>
        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <SettingRow
            icon="moon.fill"
            iconColor="#7C3AED"
            label="Dark Mode"
            description={colorScheme === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
            value={colorScheme === 'dark'}
            onValueChange={handleDarkMode}
            c={c}
          />
        </View>

        {/* ── Notifications ── */}
        <Text style={[s.sectionLabel, { color: c.textMuted }]}>NOTIFICATIONS & SOUND</Text>
        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <SettingRow
            icon="bell.fill"
            iconColor="#1D4ED8"
            label="In-App Notifications"
            description="Show alerts for approvals, updates, and reminders"
            value={notificationsEnabled}
            onValueChange={handleNotifications}
            c={c}
          />
          <SettingRow
            icon="speaker.wave.2.fill"
            iconColor="#15803D"
            label="Sound"
            description="Play sound for new notifications and chat messages"
            value={soundEnabled}
            onValueChange={handleSound}
            c={c}
          />
        </View>

        {/* ── About ── */}
        <Text style={[s.sectionLabel, { color: c.textMuted }]}>ABOUT</Text>
        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <InfoRow
            icon="info.circle.fill"
            iconColor="#0369A1"
            label="App Version"
            value={buildNumber ? `${appVersion} (${buildNumber})` : appVersion}
            c={c}
          />
          <InfoRow
            icon="building.2.fill"
            iconColor="#946200"
            label="Company"
            value="Al Yafour General Contracting & Transport LLC"
            c={c}
          />
          <InfoRow
            icon="mappin.circle.fill"
            iconColor="#B42318"
            label="Registered"
            value="Abu Dhabi, UAE · CN-1028096"
            c={c}
          />
        </View>

        {/* ── Navigation ── */}
        <Text style={[s.sectionLabel, { color: c.textMuted }]}>NAVIGATION</Text>
        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <InfoRow
            icon="person.crop.circle.fill"
            iconColor="#526173"
            label="My Profile"
            value="View and manage your account"
            c={c}
            onPress={() => router.push('/(tabs)/profile' as any)}
          />
          <InfoRow
            icon="bell.badge.fill"
            iconColor="#1D4ED8"
            label="Notifications"
            value="View all alerts and messages"
            c={c}
            onPress={() => router.push('/(tabs)/notifications' as any)}
          />
        </View>

        {/* ── Support ── */}
        <Text style={[s.sectionLabel, { color: c.textMuted }]}>SUPPORT</Text>
        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <InfoRow
            icon="envelope.fill"
            iconColor="#526173"
            label="IT Support"
            value="engineering.dep@alyafour.com"
            c={c}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: { flex: 1 },
  label: { fontSize: 15, fontWeight: '500' },
  desc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
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
});
