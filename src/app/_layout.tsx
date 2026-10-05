import 'react-native-gesture-handler';
import '../../global.css';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Loader } from '@/components/ui/Loader';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { AppProviders } from '@/providers/AppProviders';
import { initSentry } from '@/services/sentryService';
import { initMixpanel } from '@/services/mixpanelService';
import { configureNotificationHandler } from '@/hooks/usePushRegistration';

SplashScreen.preventAutoHideAsync().catch(() => {});
initSentry();
initMixpanel();
configureNotificationHandler();

function RootLayoutNav() {
  const { isDark, colors } = useTheme();
  const { isHydrated, isInitialized } = useAuth();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const fontsReady = fontsLoaded || !!fontError;
  const isAppReady = fontsReady && isHydrated && isInitialized;

  useEffect(() => {
    if (__DEV__) {
      console.log('[RootLayout] state', {
        fontsLoaded,
        fontError: fontError?.message,
        isHydrated,
        isInitialized,
        isAppReady,
      });
    }
  }, [fontsLoaded, fontError, isHydrated, isInitialized, isAppReady]);

  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  if (!isAppReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Loader fullScreen message="Starting app..." />
      </View>
    );
  }

  if (__DEV__) {
    console.log('[RootLayout] rendering navigation stack');
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(drawer)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  if (__DEV__) {
    console.log('[RootLayout] mount');
  }

  return (
    <ErrorBoundary>
      <AppProviders>
        <RootLayoutNav />
      </AppProviders>
    </ErrorBoundary>
  );
}
