import { create } from 'zustand';
import { t } from '@/i18n';

// Many call sites toast a fixed English sentence. Rather than editing every one,
// the sentence is looked up in `toastMessages` (key = lower-cased message with
// non-alphanumerics collapsed to "_") and shown in the user's language when a
// translation exists; unknown or dynamic messages (e.g. server errors) pass through.
const localizeToast = (message: string): string => {
  const key = `toastMessages.${message.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
  const translated = t(key);
  return translated === key ? message : translated;
};

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
  show: (message, type = 'info') => set((state) => ({ visible: true, id: state.id + 1, message: localizeToast(message), type })),
  hide: () => set({ visible: false, message: '' }),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().show(message, 'success'),
  error: (message: string) => useToastStore.getState().show(message, 'error'),
  info: (message: string) => useToastStore.getState().show(message, 'info'),
};
