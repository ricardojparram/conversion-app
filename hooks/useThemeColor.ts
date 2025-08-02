/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

//@ts-ignore
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function useThemeColor(
  ...colors: string[]
) {
  const theme = useColorScheme() ?? 'light';
  return colors.map((colorName) => Colors[theme][colorName]);
}
