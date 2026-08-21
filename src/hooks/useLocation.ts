import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

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

      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
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
