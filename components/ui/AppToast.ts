/**
 * Canonical name for the design-system toast.
 * Implementation: Toast.tsx (ToastContainer mounted once in app/_layout.tsx)
 * driven by the `toast()` helper in lib/hooks/use-toast.
 */
export { ToastContainer as AppToast } from '@/components/ui/Toast';
export { toast } from '@/lib/hooks/use-toast';
