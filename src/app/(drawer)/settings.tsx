import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { Card, Header, Pressable, ScreenContent } from '@/components/ui';
import { useBiometricStore } from '@/store/biometricStore';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';
import { isExpoGo } from '@/utils/expoGo';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const biometricEnabled = useBiometricStore((s) => s.enabled);
  const setBiometricEnabled = useBiometricStore((s) => s.setEnabled);

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
      Alert.alert(
        'Not Available in Expo Go',
        'Push notifications require a development build. Use "npx expo run:android" or "run:ios" instead of Expo Go.',
      );
      return;
    }
    if (value) {
      const Notifications = await import('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsGranted(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Enable notifications for this app in your device Settings to receive push alerts.',
        );
      }
      return;
    }
    Alert.alert(
      'Turn Off Notifications',
      'Push notifications are controlled by your device settings. Open Settings to disable them for this app.',
    );
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (!value) {
      setBiometricEnabled(false);
      return;
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        'Not Available',
        'Set up Face ID or fingerprint unlock in your device settings first.',
      );
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirm to enable app lock',
    });
    if (result.success) {
      setBiometricEnabled(true);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Settings" subtitle="App preferences" />
      <ScreenContent>
        <Card className="mb-4">
          <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
            APPEARANCE
          </Text>
          {THEME_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setMode(option.value)}
              className="flex-row items-center justify-between py-3 border-b"
              style={{ borderColor: colors.border }}
            >
              <Text style={{ color: colors.text }}>{option.label}</Text>
              {mode === option.value ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : null}
            </Pressable>
          ))}
        </Card>

        <Card className="mb-4">
          <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
            NOTIFICATIONS
          </Text>
          <View className="flex-row items-center justify-between py-2">
            <Text style={{ color: colors.text }}>Push Notifications</Text>
            <Switch
              value={notificationsGranted ?? false}
              onValueChange={handleToggleNotifications}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </Card>

        <Card className="mb-4">
          <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
            SECURITY
          </Text>
          <View className="flex-row items-center justify-between py-3 border-b" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center flex-1">
              <Ionicons name="finger-print-outline" size={20} color={colors.primary} />
              <Text className="ml-3 flex-1" style={{ color: colors.text }}>
                Biometric Lock
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
              Two-Factor Authentication
            </Text>
            <Text className="text-xs font-semibold" style={{ color: '#16a34a' }}>
              Always On
            </Text>
          </View>
        </Card>

        <Card className="mb-8">
          <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
            ABOUT
          </Text>
          <SettingRow
            icon="information-circle-outline"
            label="App Version"
            value={Constants.expoConfig?.version ?? '1.0.0'}
            colors={colors}
          />
          <SettingRow icon="globe-outline" label="BookMyDarzi Admin" value="Enterprise" colors={colors} />
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View className="flex-row items-center py-3 border-b" style={{ borderColor: colors.border }}>
    <Ionicons name={icon} size={20} color={colors.primary} />
    <Text className="ml-3 flex-1" style={{ color: colors.text }}>
      {label}
    </Text>
    {value ? (
      <Text style={{ color: colors.textMuted }}>{value}</Text>
    ) : (
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    )}
  </View>
);
