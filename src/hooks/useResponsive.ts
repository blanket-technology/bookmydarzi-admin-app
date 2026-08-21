import { useWindowDimensions } from 'react-native';

// Single source of truth for breakpoints - before this, screens that cared
// about width at all (a handful) each hardcoded their own ad-hoc check or a
// flat `maxWidth: 900` cap with no real breakpoint logic, and most screens
// had no width-awareness at all (fine on phones, wastes tablet/desktop-web
// space and never offers a permanent sidebar).
const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;

export interface Responsive {
  width: number;
  height: number;
  /** >=768px - iPad mini and up, and any Android tablet in that class. */
  isTablet: boolean;
  /** >=1024px - iPad landscape, most laptop/desktop browser widths (Expo web). */
  isDesktop: boolean;
  /** Convenience: isTablet || isDesktop - "not a phone-sized screen". */
  isLargeScreen: boolean;
  /** Content column width for centered single-column screens (forms, detail
   * pages) - grows with the screen instead of a single flat 900 cap, so a
   * phone gets full width and a desktop gets a comfortable reading column
   * instead of either cramped or absurdly stretched content. */
  contentMaxWidth: number;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  let contentMaxWidth = width;
  if (isDesktop) contentMaxWidth = 1100;
  else if (isTablet) contentMaxWidth = 760;

  return {
    width,
    height,
    isTablet,
    isDesktop,
    isLargeScreen: isTablet,
    contentMaxWidth,
  };
}
