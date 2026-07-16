import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Button, Card, Header } from '@/components/ui';
import { API_CONFIG } from '@/config/api';
import { ENDPOINTS } from '@/services/endpoints';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';
import { runApiDiagnostics, type ApiDiagnosticResult } from '@/utils/apiDiagnostics';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [apiTesting, setApiTesting] = useState(false);
  const [apiResult, setApiResult] = useState<ApiDiagnosticResult | null>(null);

  const runApiTest = async () => {
    setApiTesting(true);
    try {
      const result = await runApiDiagnostics();
      setApiResult(result);
      console.log('[API Test] Full diagnostics:', JSON.stringify(result, null, 2));
    } finally {
      setApiTesting(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Settings" subtitle="App preferences" />
      <ScrollView className="px-5">
        <Card className="mb-4">
          <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
            API CONNECTIVITY (DEBUG)
          </Text>
          <Text className="text-xs mb-2" style={{ color: colors.textMuted }}>
            Base URL: {API_CONFIG.BASE_URL}
          </Text>
          <Text className="text-xs mb-4" style={{ color: colors.textMuted }}>
            Test: GET {ENDPOINTS.ADMIN.DASHBOARD}
          </Text>
          <Button
            title="Test Dashboard API"
            onPress={runApiTest}
            loading={apiTesting}
            fullWidth
          />
          {apiResult ? (
            <View
              className="mt-4 p-3 rounded-2xl border"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              <Text className="text-xs font-semibold mb-2" style={{ color: colors.text }}>
                Diagnostics Result
              </Text>
              <Text className="text-[10px] leading-4" style={{ color: colors.textSecondary }}>
                {JSON.stringify(apiResult, null, 2)}
              </Text>
            </View>
          ) : null}
        </Card>

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
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </Card>

        <Card className="mb-4">
          <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
            SECURITY
          </Text>
          <SettingRow icon="shield-checkmark-outline" label="Biometric Login" colors={colors} />
          <SettingRow icon="key-outline" label="Two-Factor Auth" colors={colors} />
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
      </ScrollView>
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
