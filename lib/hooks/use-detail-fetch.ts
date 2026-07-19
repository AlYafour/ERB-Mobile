import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/lib/hooks/use-toast';
import { useRefetchOnFocus } from '@/lib/hooks/use-refetch-on-focus';

export interface UseDetailFetchResult<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  /** Re-run the fetch (e.g. after an approve/reject action mutates the record). */
  reload: () => Promise<void>;
  /** Wire directly to a RefreshControl's onRefresh. */
  onRefresh: () => void;
}

/**
 * Generalizes the load/loading/refreshing/toast-on-error scaffold duplicated
 * across every app/**\/[id].tsx detail screen (reference shape:
 * app/products/[id].tsx). Every one of those screens repeats:
 *
 * ```ts
 * const load = async () => {
 *   try {
 *     setLoading(true);
 *     setProduct(await productsApi.getById(id));
 *   } catch (err: any) {
 *     toast(err.message || 'Failed to load product', 'error');
 *   } finally {
 *     setLoading(false);
 *     setRefreshing(false);
 *   }
 * };
 * useEffect(() => { load(); }, [id]);
 * useRefetchOnFocus(load);
 * ```
 *
 * `useDetailFetch` replaces all of that with one call:
 * ```ts
 * const { data: product, loading, refreshing, reload, onRefresh } =
 *   useDetailFetch(id => productsApi.getById(id), id, 'Failed to load product');
 * ```
 *
 * `fetchFn` is typically an inline arrow re-created every render — it's read
 * through a ref so `reload` stays referentially stable and the load effect
 * only re-fires when `id` actually changes, not on every parent re-render.
 */
export function useDetailFetch<T, TId = number>(
  fetchFn: (id: TId) => Promise<T>,
  id: TId,
  errorMessage = 'Failed to load',
): UseDetailFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFnRef = useRef(fetchFn);
  useEffect(() => { fetchFnRef.current = fetchFn; }, [fetchFn]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await fetchFnRef.current(id));
    } catch (err: any) {
      toast(err.message || errorMessage, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, errorMessage]);

  useEffect(() => { load(); }, [load]);
  // Stale-detail fix: refetch when the screen regains focus (a child
  // flow - create QR/PO/GRN/invoice, approve, edit - can change this
  // document's state while this screen stays mounted underneath).
  useRefetchOnFocus(load);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { data, loading, refreshing, reload: load, onRefresh };
}
