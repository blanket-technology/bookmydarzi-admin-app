import { create } from 'zustand';

// Tracks the app-wide WebSocket's real connection state (useAppSocket.ts)
// separately from device network connectivity (useNetworkStatus/
// OfflineBanner.tsx) - a phone can have a perfectly good internet
// connection while the socket itself is mid-reconnect (server restart,
// brief network blip that killed the TCP connection but not general
// connectivity, backgrounded-then-foregrounded app). Previously nothing
// surfaced this distinction at all: a staff member could be sitting on a
// dead real-time connection with zero visible indication, silently missing
// new-offer alerts until the next 30s poll happened to catch up.
export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface WsStatusState {
  status: WsConnectionStatus;
  setStatus: (status: WsConnectionStatus) => void;
}

export const useWsStatusStore = create<WsStatusState>((set) => ({
  status: 'connecting',
  setStatus: (status) => set({ status }),
}));

export const wsStatus = {
  setConnecting: () => useWsStatusStore.getState().setStatus('connecting'),
  setConnected: () => useWsStatusStore.getState().setStatus('connected'),
  setDisconnected: () => useWsStatusStore.getState().setStatus('disconnected'),
};
