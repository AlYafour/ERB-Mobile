import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';

const PUBLIC_SEGMENTS = new Set(['login', 'register']);

/**
 * Global navigation guard — the missing piece that used to strand users.
 *
 * Previously only app/index.tsx routed on auth state, and it unmounts once
 * the user enters the tabs. When a mid-session 401 cleared the session, the
 * user stayed on a dead authenticated screen with no redirect. This guard
 * lives at the root for the whole app lifetime:
 *   session lost  → replace to /login (from any protected screen)
 *   already authed on /login → replace into the app
 */
export function AuthGate() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const first = segments[0] as string | undefined;
    const onPublic = first === undefined || PUBLIC_SEGMENTS.has(first);

    if (!user && !onPublic) {
      router.replace('/login');
    } else if (user && first === 'login') {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, router]);

  return null;
}
