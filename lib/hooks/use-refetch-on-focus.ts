import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Refetch a screen's data whenever it REGAINS navigation focus.
 *
 * Expo Router stack screens stay mounted in the background, so a list
 * navigated away from (create flow, detail actions) keeps showing stale
 * data until the user leaves the module and comes back. This hook re-runs
 * the loader on every focus AFTER the first one (the mount effect covers
 * the initial load).
 *
 * The loader is read through a ref so the focus effect never re-subscribes
 * (and never re-fires) just because the loader closure was recreated on a
 * re-render — it always calls the LATEST loader with current state.
 */
export function useRefetchOnFocus(refetch: () => void) {
  const first = useRef(true);
  const fnRef = useRef(refetch);

  useEffect(() => {
    fnRef.current = refetch;
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      fnRef.current();
    }, [])
  );
}
