// Matches the BookMyDarzi customer app's brand palette (react_app/constants/theme.ts
// COLORS) so both apps read as the same product. Only the palette is shared —
// this app's existing layout/spacing/components are unchanged.
export const lightColors = {
  background: '#FAFAFA',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#2C1A0E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#1aa3b0',
  primaryLight: '#e0f7f8',
  accent: '#C9A84C',
  success: '#065F46',
  warning: '#C9A84C',
  error: '#B91C1C',
  info: '#1aa3b0',
  drawer: '#0c6c75',
  drawerText: '#F5E6C0',
  overlay: 'rgba(13, 13, 13, 0.45)',
} as const;

export const darkColors = {
  background: '#0D0D0D',
  surface: '#1c1c1c',
  card: '#1c1c1c',
  text: '#F5EFE6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#2C2C2C',
  primary: '#3fc3cf',
  primaryLight: '#0c6c75',
  accent: '#F5E6C0',
  success: '#34d399',
  warning: '#F5E6C0',
  error: '#f87171',
  info: '#3fc3cf',
  drawer: '#0c6c75',
  drawerText: '#F5E6C0',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ThemeColors = {
  [K in keyof typeof lightColors]: string;
};
