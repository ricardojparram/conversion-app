/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function useThemeColor<T extends keyof typeof Colors.light & keyof typeof Colors.dark>(
  ...colors: T[]
) {
  const theme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  return colors.map((colorName) => Colors[theme][colorName]);
}
