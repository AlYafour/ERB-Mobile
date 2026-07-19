import { useCallback, useEffect, useRef } from 'react';

/**
 * Shared staleness-guard primitive extracted from app/purchase-requests.tsx
 * (reqSeq/abortRef/mountedRef pattern).
 *
 * List screens that reload on page/search/filter changes can have responses
 * arrive out of order (a slow "page 1" response landing after a fast
 * "page 2" one), and a screen can be left before its in-flight request
 * resolves. This hook centralizes the three guards every such loader needs:
 *
 * - `nextSignal()` — call at the top of the loader. It bumps the request
 *   sequence, aborts whatever request was previously in flight, and returns
 *   the new `{ seq, signal }` pair: pass `signal` to the API call's
 *   `{ signal }` option, and hold onto `seq` for the checks below.
 * - `isCurrent(seq)` — call after the await (and in the catch/finally) to
 *   confirm this response is still the latest one; an older, superseded
 *   response should bail out without touching state.
 * - `mountedRef` — read directly (independent of any request sequence)
 *   before any setState that isn't already gated by `isCurrent`, e.g. a
 *   secondary fetch unrelated to the main paginated loader.
 *
 * Usage (mirrors purchase-requests.tsx's loadRequests):
 * ```ts
 * const { nextSignal, isCurrent, mountedRef } = useCancellableFetch();
 *
 * const load = useCallback(async () => {
 *   const { seq, signal } = nextSignal();
 *   try {
 *     const response = await api.getAll(params, { signal });
 *     if (!isCurrent(seq)) return;
 *     setData(response);
 *   } catch (err: any) {
 *     if (!isCurrent(seq) || signal.aborted) return;
 *     toast(err.message, 'error');
 *   } finally {
 *     if (isCurrent(seq)) setLoading(false);
 *   }
 * }, [nextSignal, isCurrent, ...deps]);
 * ```
 */
export interface CancellableFetch {
  /**
   * Bump the request sequence, abort any previously in-flight request, and
   * return the new sequence number together with its AbortSignal. `seq` and
   * `signal` are handed back together (rather than separately) so they can
   * never desync — the sequence bump and the controller swap are one atomic
   * step, exactly like `++reqSeq.current` + `abortRef.current = controller`
   * were one block in the original code.
   */
  nextSignal: () => { seq: number; signal: AbortSignal };
  /** True if `seq` (from `nextSignal()`) is still the latest request. */
  isCurrent: (seq: number) => boolean;
  /** False once the component has unmounted. */
  mountedRef: React.MutableRefObject<boolean>;
}

export function useCancellableFetch(): CancellableFetch {
  const reqSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const nextSignal = useCallback(() => {
    const seq = ++reqSeq.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return { seq, signal: controller.signal };
  }, []);

  const isCurrent = useCallback((seq: number) => seq === reqSeq.current, []);

  return { nextSignal, isCurrent, mountedRef };
}
