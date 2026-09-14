import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { Card, Header, Pressable, ScreenContent } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useBiometricStore } from '@/store/biometricStore';
import { useTheme } from '@/hooks/useTheme';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';
import { isExpoGo } from '@/utils/expoGo';
import type { AppLanguage } from '@/i18n';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const LANGUAGE_OPTIONS: { label: string; value: AppLanguage }[] = [
  { label: 'English', value: 'en' },
  { label: 'हिन्दी', value: 'hi' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const biometricEnabled = useBiometricStore((s) => s.enabled);
  const setBiometricEnabled = useBiometricStore((s) => s.setEnabled);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const { user } = useAuth();
  // Language switcher is specifically for tailor/bridge (employee) ease of
  // use, per product decision - admin/superadmin are assumed comfortable in
  // English, so this is a visibility check (not a permission gate), same
  // simple role-string comparison style as useAutoOnline.ts.
  const role = String(user?.role ?? '').toLowerCase();
  const showLanguageSwitcher = role === 'tailor' || role === 'employee';

  // Reflects the OS-level permission actually granted — not a local
  // preference — since usePushRegistration (drawer layout) is what actually
  // registers/unregisters the device token based on this same permission.
  const [notificationsGranted, setNotificationsGranted] = useState<boolean | null>(null);

  useEffect(() => {
    // Expo Go (SDK 53+, Android) doesn't support expo-notifications at all -
    // even a static top-level import throws (see usePushRegistration.ts's
    // isExpoGo comment). Dynamic import keeps the module out of this
    // screen's load path entirely when running under Expo Go.
    if (isExpoGo) {
      setNotificationsGranted(false);
      return;
    }
    import('expo-notifications').then((Notifications) =>
      Notifications.getPermissionsAsync().then(({ status }) =>
        setNotificationsGranted(status === 'granted'),
      ),
    );
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    if (isExpoGo) {
      Alert.alert(t('settings.alerts.expoGoTitle'), t('settings.alerts.expoGoBody'));
      return;
    }
    if (value) {
      const Notifications = await import('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsGranted(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(t('settings.alerts.permissionNeededTitle'), t('settings.alerts.permissionNeededBody'));
      }
      return;
    }
    Alert.alert(t('settings.alerts.turnOffNotifTitle'), t('settings.alerts.turnOffNotifBody'));
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (!value) {
      setBiometricEnabled(false);
      return;
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      Alert.alert(t('settings.alerts.notAvailableTitle'), t('settings.alerts.notAvailableBody'));
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('settings.alerts.confirmAppLock'),
    });
    if (result.success) {
      setBiometricEnabled(true);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <ScreenContent>
        <Card className="mb-4">
          <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
            {t('settings.appearance')}
          </Text>
          {THEME_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setMode(option.value)}
              className="flex-row items-center justify-between py-3 border-b"
              style={{ borderColor: colors.border }}
            >
              <Text style={{ color: colors.text }}>{t(`settings.theme.${option.value}`)}</Text>
              {mode === option.value ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : null}
            </Pressable>
          ))}
        </Card>

        {showLanguageSwitcher ? (
          <Card className="mb-4">
            <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
              {t('settings.language')}
            </Text>
            {LANGUAGE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setLanguage(option.value)}
                className="flex-row items-center justify-between py-3 border-b"
                style={{ borderColor: colors.border }}
              >
                <Text style={{ color: colors.text }}>{option.label}</Text>
                {language === option.value ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </Card>
        ) : null}

        <Card className="mb-4">
          <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
            {t('settings.notifications')}
          </Text>
          <View className="flex-row items-center justify-between py-2">
            <Text style={{ color: colors.text }}>{t('settings.pushNotifications')}</Text>
            <Switch
              value={notificationsGranted ?? false}
              onValueChange={handleToggleNotifications}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </Card>

        <Card className="mb-4">
          <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
            {t('settings.security')}
          </Text>
          <View className="flex-row items-center justify-between py-3 border-b" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center flex-1">
              <Ionicons name="finger-print-outline" size={20} color={colors.primary} />
              <Text className="ml-3 flex-1" style={{ color: colors.text }}>
                {t('settings.biometricLock')}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <View className="flex-row items-center py-3">
            <Ionicons name="key-outline" size={20} color={colors.primary} />
            <Text className="ml-3 flex-1" style={{ color: colors.text }}>
              {t('settings.twoFactorAuth')}
            </Text>
            <Text className="text-xs font-semibold" style={{ color: '#16a34a' }}>
              {t('settings.alwaysOn')}
            </Text>
          </View>
        </Card>

        <Card className="mb-8">
          <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
            {t('settings.about')}
          </Text>
          <SettingRow
            icon="information-circle-outline"
            label={t('settings.appVersion')}
            value={Constants.expoConfig?.version ?? '1.0.0'}
            colors={colors}
          />
          <SettingRow icon="globe-outline" label="BookMyDarzi Admin" value="Enterprise" colors={colors} />
          <SettingRow
            icon="shield-checkmark-outline"
            label={t('settings.privacyPolicy')}
            colors={colors}
            // expo-router's typed-routes type is generated by a running dev
            // server / prebuild and hasn't picked up this new screen file
            // yet - the path is correct and works at runtime.
            onPress={() => router.push('/(drawer)/privacy-policy' as Parameters<typeof router.push>[0])}
          />
        </Card>
      </ScreenContent>
    </View>
  );
}

const SettingRow = ({
  icon,
  label,
  value,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress?: () => void;
}) => {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      className="flex-row items-center py-3 border-b"
      style={{ borderColor: colors.border }}
      {...(onPress ? { onPress } : {})}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text className="ml-3 flex-1" style={{ color: colors.text }}>
        {label}
      </Text>
      {value ? (
        <Text style={{ color: colors.textMuted }}>{value}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </Wrapper>
  );
};
