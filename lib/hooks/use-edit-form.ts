import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { toast } from '@/lib/hooks/use-toast';

export interface UseEditFormOptions<F> {
  /** Re-runs the load effect when this changes (typically the record id). */
  id: number | string;
  /** Fetches the record (plus any side data, e.g. dropdown options via its
   *  own local state setters) and returns the initial form values. */
  load: () => Promise<F>;
  /** Returns a field->message error map; empty object means valid. */
  validate: (form: F) => Record<string, string>;
  /** Persists the form. Rejecting shows `submitErrorMessage` (or its own message). */
  submit: (form: F) => Promise<any>;
  loadErrorMessage?: string;
  successMessage?: string;
  submitErrorMessage?: string;
}

export interface UseEditFormResult<F> {
  loading: boolean;
  saving: boolean;
  errors: Record<string, string>;
  form: F | null;
  setForm: React.Dispatch<React.SetStateAction<F | null>>;
  /** `set('fieldName')(value)` — the identical per-field setter duplicated
   *  across every edit screen. */
  set: (key: keyof F) => (val: any) => void;
  handleSubmit: () => Promise<void>;
}

/**
 * Generalizes the loading/saving/errors/form state, the `set()` per-field
 * setter, the validate-then-submit `handleSubmit` flow, and the
 * load-fails-then-go-back behavior duplicated identically across
 * products/[id]/edit.tsx, suppliers/[id]/edit.tsx and projects/[id]/edit.tsx.
 *
 * `load` is a plain async function defined by the caller — it can fetch
 * side data (e.g. the supplier dropdown options in products/[id]/edit.tsx)
 * via its own closures/local state setters before returning the form shape.
 */
export function useEditForm<F extends Record<string, any>>({
  id,
  load,
  validate,
  submit,
  loadErrorMessage = 'Failed to load',
  successMessage = 'Saved successfully',
  submitErrorMessage = 'Failed to save',
}: UseEditFormOptions<F>): UseEditFormResult<F> {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<F | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then((f) => { if (!cancelled) setForm(f); })
      .catch((err: any) => {
        if (cancelled) return;
        toast(err.message || loadErrorMessage, 'error');
        router.back();
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (key: keyof F) => (val: any) =>
    setForm((f) => (f ? { ...f, [key]: val } : f));

  const handleSubmit = async () => {
    if (!form) return;
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    try {
      setSaving(true);
      await submit(form);
      toast(successMessage, 'success');
      router.back();
    } catch (err: any) {
      toast(err.message || submitErrorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  return { loading, saving, errors, form, setForm, set, handleSubmit };
}
