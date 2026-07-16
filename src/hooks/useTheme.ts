import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from '@/theme';
import { useThemeStore } from '@/store/themeStore';

export const useTheme = (): { colors: ThemeColors; isDark: boolean; mode: string } => {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((state) => state.mode);

  const isDark =
    mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
    mode,
  };
};
