import { useAppTheme } from '@/contexts/ThemeContext';

export function useColorScheme(): 'light' | 'dark' {
  const { colorScheme } = useAppTheme();
  return colorScheme;
}
