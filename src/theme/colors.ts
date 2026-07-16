export const lightColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  primary: '#7c3aed',
  primaryLight: '#ede9fe',
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  drawer: '#4c1d95',
  drawerText: '#f5f3ff',
  overlay: 'rgba(15, 23, 42, 0.5)',
} as const;

export const darkColors = {
  background: '#0f172a',
  surface: '#1e293b',
  card: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: '#334155',
  primary: '#a78bfa',
  primaryLight: '#2e1065',
  accent: '#fbbf24',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  drawer: '#1e1b4b',
  drawerText: '#ede9fe',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ThemeColors = {
  [K in keyof typeof lightColors]: string;
};
