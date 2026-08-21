import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { broadcastService } from '@/services/broadcastService';
import { pickupService } from '@/services/pickupService';
import { useAuth } from '@/hooks/useAuth';

// Solves "forgot to toggle online" without the risk of a blind IsOnline=True
// default: Tailor.IsOnline has no non-null-location requirement in the
// broadcast fallback round (app/services/broadcast/broadcast_service.py), so
// simply defaulting the DB column would let a tailor with stale/missing GPS
// still be offered orders they can't fulfil. This only flips a role to
// online once a FRESH GPS fix actually succeeds - same safety guarantee as
// the existing manual toggle, just fired automatically on login/foreground
// instead of requiring the user to remember.
//
// Employees: pickup and delivery broadcasts share one online-status endpoint
// (PATCH /employee/me/online, see pickupService's own comment), so a single
// call covers both.
export function useAutoOnline() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const attemptedRef = useRef(false);

  useEffect(() => {
    const role = String(user?.role ?? '').toLowerCase();
    const isTailor = role === 'tailor';
    const isEmployee = role === 'employee';
    if (!isAuthenticated || (!isTailor && !isEmployee)) return;

    const goOnlineIfLocationAvailable = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        // Deliberately does NOT prompt for permission here - an unsolicited
        // permission dialog on app launch is a bad first impression. The
        // manual "go online" toggle (which the user has presumably already
        // used once) is what first requests it; this only auto-applies once
        // permission already exists.
        if (status !== 'granted') {
          if (__DEV__) console.log('[useAutoOnline] skipped: location permission not granted', status);
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = position.coords;

        if (isTailor) {
          const result = await broadcastService.setOnlineStatus({ is_online: true, latitude, longitude });
          queryClient.invalidateQueries({ queryKey: ['tailor', 'me'] });
          if (__DEV__) console.log('[useAutoOnline] tailor set online', result);
        } else {
          const result = await pickupService.setOnlineStatus({ is_online: true, latitude, longitude });
          queryClient.setQueryData(QUERY_KEYS.EMPLOYEE_ONLINE_STATUS, result);
          queryClient.invalidateQueries({ queryKey: ['pickup-broadcasts'] });
          queryClient.invalidateQueries({ queryKey: ['delivery-broadcasts'] });
          if (__DEV__) console.log('[useAutoOnline] employee set online', result);
        }
      } catch (err) {
        // Best-effort background convenience - GPS timeout, permission
        // revoked mid-flight, offline, etc. should never surface to the
        // user or block anything; they can still go online manually.
        if (__DEV__) console.log('[useAutoOnline] failed', err);
      }
    };

    if (!attemptedRef.current) {
      attemptedRef.current = true;
      goOnlineIfLocationAvailable();
    }

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') goOnlineIfLocationAvailable();
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, user?.role, queryClient]);
}
