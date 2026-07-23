import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toast } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/authContext';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { ApiError } from '@/types/api';

interface AppProvidersProps {
  children: ReactNode;
}

// A 4xx means the request itself is wrong (bad auth, bad input, not found) —
// retrying sends the exact same request and gets the exact same rejection,
// just 3x the network calls and 3x the identical console noise. Only retry
// what's actually transient: network failures and 5xx.
const isRetryableError = (error: unknown): boolean => {
  const status = (error as ApiError)?.status;
  return status === undefined || status >= 500;
};

export const AppProviders = ({ children }: AppProvidersProps) => {
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
            <Toast />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
