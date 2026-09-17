// White/neutral theme - no teal anywhere. Gold/amber (the app's existing
// `accent`) is now the single primary accent for buttons, active states,
// badges and links; the drawer is a warm ivory shade distinct from the
// white content area, not another saturated brand color.
export const lightColors = {
  background: '#FAFAFA',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#2C1A0E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#B8923E',
  primaryLight: '#FBF3DF',
  // Text/icon color for content drawn on top of `primary`/`accent` (e.g.
  // Button's primary variant). White on this gold only hits ~2.9:1 contrast
  // (fails WCAG AA's 4.5:1) - a dark, near-black tone reads clearly against
  // both light and dark mode's gold shades, so both themes use the same
  // approach here rather than white.
  onPrimary: '#2C1A0E',
  accent: '#B8923E',
  success: '#065F46',
  warning: '#B8923E',
  error: '#B91C1C',
  onError: '#ffffff',
  info: '#6B7280',
  drawer: '#FAF7F2',
  drawerText: '#2C1A0E',
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
  primary: '#D9B45C',
  primaryLight: '#3a2f1a',
  // Same reasoning as light mode's onPrimary - white text on this lighter
  // gold in dark mode was even worse (~2.0:1). A dark tone keeps the same
  // readable pairing regardless of theme.
  onPrimary: '#2C1A0E',
  accent: '#D9B45C',
  success: '#34d399',
  warning: '#D9B45C',
  error: '#f87171',
  // #f87171 is a lighter red than light mode's #B91C1C - white text on it
  // only hits ~2.2:1 (fails WCAG AA), same underlying issue as onPrimary
  // above. A dark tone reads clearly against this shade too.
  onError: '#2C1A0E',
  info: '#9CA3AF',
  drawer: '#211a10',
  drawerText: '#F5E6C0',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ThemeColors = {
  [K in keyof typeof lightColors]: string;
};
