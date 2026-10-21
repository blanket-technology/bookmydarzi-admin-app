import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

// getCurrentPositionAsync has no built-in timeout - on a poor/indoor GPS
// fix it can hang indefinitely, which left the online toggle stuck forever
// mid-flight (Switch shows disabled via togglingOnline, awaiting a promise
// that never resolves) with no error ever surfaced - looked exactly like
// "the toggle doesn't work" from the outside.
const LOCATION_FIX_TIMEOUT_MS = 12_000;

const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);

export interface UseLocationResult {
  coords: LocationCoords | null;
  permissionStatus: LocationPermissionStatus;
  isWatching: boolean;
  error: string | null;
  /** Request foreground permission and, if granted, start the watch loop. */
  start: () => Promise<boolean>;
  stop: () => void;
}

/**
 * Foreground GPS tracking for the delivery-broadcast "online" toggle.
 * Mirrors the tailor side's mental model (Tailor.Latitude/Longitude kept
 * fresh while online) but there's no existing RN pattern in this app to
 * copy from — expo-location wasn't installed before this feature.
 */
export function useLocation(): UseLocationResult {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('undetermined');
  const [isWatching, setIsWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const stop = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsWatching(false);
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionStatus('denied');
        setError('Location permission is required to go online.');
        return false;
      }
      setPermissionStatus('granted');

      const initial = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        LOCATION_FIX_TIMEOUT_MS,
        'Could not get a GPS fix - check your location signal and try again.',
      );
      setCoords({
        latitude: initial.coords.latitude,
        longitude: initial.coords.longitude,
      });

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 20_000,
          distanceInterval: 50,
        },
        (update) => {
          setCoords({
            latitude: update.coords.latitude,
            longitude: update.coords.longitude,
          });
        },
      );
      setIsWatching(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location.');
      return false;
    }
  }, []);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      setPermissionStatus(status === 'granted' ? 'granted' : 'undetermined');
    });
    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, []);

  return { coords, permissionStatus, isWatching, error, start, stop };
}
