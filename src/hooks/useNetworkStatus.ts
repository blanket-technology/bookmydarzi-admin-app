import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  /** True only after the first NetInfo event has resolved (avoids a false-offline flash on mount). */
  isResolved: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    isResolved: false,
  });

  useEffect(() => {
    const apply = (state: NetInfoState) =>
      setStatus({
        // Wi-Fi/cellular attached but no actual internet (captive portal, dead
        // link) must count as offline too.
        isConnected: (state.isConnected ?? true) && state.isInternetReachable !== false,
        isInternetReachable: state.isInternetReachable,
        isResolved: true,
      });

    const unsubscribe = NetInfo.addEventListener(apply);
    NetInfo.fetch().then(apply);
    return unsubscribe;
  }, []);

  return status;
}
