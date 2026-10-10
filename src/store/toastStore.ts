import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  visible: boolean;
  /** Increments on every show() so a new toast restarts the dismiss timer. */
  id: number;
  message: string;
  type: ToastType;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  id: 0,
  message: '',
  type: 'info',
  show: (message, type = 'info') => set((state) => ({ visible: true, id: state.id + 1, message, type })),
  hide: () => set({ visible: false, message: '' }),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().show(message, 'success'),
  error: (message: string) => useToastStore.getState().show(message, 'error'),
  info: (message: string) => useToastStore.getState().show(message, 'info'),
};
