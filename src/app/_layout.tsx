import 'react-native-gesture-handler';
import '../../global.css';
import '@/utils/webStyleInterop';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
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

// TEMPORARY diagnostic for the TestFlight white-screen investigation: no
// crash was ever recorded in TestFlight's own Crash Feedback (meaning the
// process isn't terminating), and the ErrorBoundary below never renders
// its "Something went wrong" fallback either - both point to an uncaught
// error OUTSIDE React's render tree (a promise rejection, or a throw from
// one of the three fire-and-forget init calls below, or RN's own global
// error handler being invoked before any component ever mounts). This
// captures that class of error and renders it as plain visible text
// instead of leaving the screen blank, bypassing React entirely so it
// works even if the rest of the app never renders. Remove once the real
// cause is found and fixed.
let diagnosticError: string | null = null;
let notifyDiagnosticError: ((msg: string) => void) | null = null;
const previousGlobalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
(global as any).ErrorUtils?.setGlobalHandler?.((error: unknown, isFatal?: boolean) => {
  const msg = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack}` : String(error);
  diagnosticError = msg;
  notifyDiagnosticError?.(msg);
  previousGlobalHandler?.(error, isFatal);
});

function DiagnosticErrorOverlay() {
  const [error, setError] = useState<string | null>(diagnosticError);
  useEffect(() => {
    notifyDiagnosticError = setError;
    return () => {
      notifyDiagnosticError = null;
    };
  }, []);
  if (!error) return null;
  return (
    <View style={{ position: 'absolute', inset: 0, backgroundColor: '#fff', zIndex: 9999, padding: 20, paddingTop: 60 }}>
      <Text style={{ fontWeight: '800', fontSize: 16, color: '#dc2626', marginBottom: 10 }}>
        Uncaught error (diagnostic build)
      </Text>
      <ScrollView>
        <Text selectable style={{ fontSize: 12, color: '#111' }}>{error}</Text>
      </ScrollView>
    </View>
  );
}

let initError: string | null = null;
try {
  initSentry();
} catch (e) {
  initError = `initSentry threw: ${e instanceof Error ? e.message : String(e)}`;
}
try {
  initMixpanel();
} catch (e) {
  initError = `initMixpanel threw: ${e instanceof Error ? e.message : String(e)}`;
}
try {
  configureNotificationHandler();
} catch (e) {
  initError = `configureNotificationHandler threw: ${e instanceof Error ? e.message : String(e)}`;
}
if (initError) {
  diagnosticError = initError;
}

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
    <>
      <ErrorBoundary>
        <AppProviders>
          <RootLayoutNav />
        </AppProviders>
      </ErrorBoundary>
      <DiagnosticErrorOverlay />
    </>
  );
}
