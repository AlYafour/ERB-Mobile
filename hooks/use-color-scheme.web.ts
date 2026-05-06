// Business app: always use light mode regardless of system setting
export function useColorScheme() {
  return 'light' as const;
}
