import { MutationCache, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { type ReactNode, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toast } from '@/components/ui/Toast';
import { SessionExpired } from '@/components/ui/SessionExpired';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ConnectionStatusBanner } from '@/components/ui/ConnectionStatusBanner';
import { IncomingOfferModal } from '@/components/ui/IncomingOfferModal';
import { AuthProvider } from '@/contexts/authContext';
import { OfferAlerts } from '@/features/pickups/components/OfferAlerts';
import { useAppSocket } from '@/hooks/useAppSocket';
import { useAutoOnline } from '@/hooks/useAutoOnline';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { ApiError } from '@/types/api';

interface AppProvidersProps {
  children: ReactNode;
}

// useAppSocket needs useQueryClient(), which requires being inside
// QueryClientProvider - so it's wrapped in a mounted component here rather
// than called directly in AppProviders, same pattern as OfferAlerts below.
const AppSocketConnection = () => {
  useAppSocket();
  return null;
};

// Same wrapping reason as AppSocketConnection above - useAutoOnline needs
// useAuth(), which requires being inside AuthProvider.
const AutoOnlineConnection = () => {
  useAutoOnline();
  return null;
};

// A 4xx means the request itself is wrong (bad auth, bad input, not found) —
// retrying sends the exact same request and gets the exact same rejection,
// just 3x the network calls and 3x the identical console noise. Only retry
// what's actually transient: network failures and 5xx.
const isRetryableError = (error: unknown): boolean => {
  const status = (error as ApiError)?.status;
  return status === undefined || status >= 500;
};

export const AppProviders = ({ children }: AppProvidersProps) => {
  // React Query pauses/resumes retries and refetches based on this — wiring
  // it to NetInfo gives every failed query a real "auto-retry on reconnect"
  // instead of leaving it stuck in an errored state until manual refresh.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(state.isConnected != null ? state.isConnected : true);
    });
    return unsubscribe;
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Safety net, not a replacement for a mutation's own onError: React
        // Query invokes both this cache-level handler and any mutation-local
        // onError (they don't override each other the way call-site options
        // do), so a screen that forgets to wire error feedback still shows a
        // toast instead of failing completely silently.
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if (mutation.options.onError) return;
            toast.error(getMutationError(error));
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: (failureCount, error) => failureCount < 2 && isRetryableError(error),
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
            <AppSocketConnection />
            <AutoOnlineConnection />
            <OfferAlerts />
            <IncomingOfferModal />
            <OfflineBanner />
            <ConnectionStatusBanner />
            <Toast />
            <SessionExpired />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
