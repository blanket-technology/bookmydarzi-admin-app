import { create } from 'zustand';

interface SessionState {
  expired: boolean;
  markExpired: () => void;
  clear: () => void;
}

// Set only when a refresh-token cycle genuinely fails (axios.ts), never on a
// user-initiated logout — RoutePermissionGuard's "no access" logout and the
// Settings "Log Out" button should not show this screen.
export const useSessionStore = create<SessionState>((set) => ({
  expired: false,
  markExpired: () => set({ expired: true }),
  clear: () => set({ expired: false }),
}));
